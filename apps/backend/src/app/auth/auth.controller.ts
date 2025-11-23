/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OAuthProviderName } from './types/auth.types';
import { OAUTH_CONFIG, OAUTH_TO_PRISMA_PROVIDER } from './config/oauth.config';
import { Query, Param, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { SocialLinkService } from './socail-link.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';

@Controller(`auth`)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialLinkService: SocialLinkService
  ) {}

  @Get(':provider/login')
  async login(
    @Param('provider') provider: OAuthProviderName,
    @Query('redirect') redirect: string,
    @Res() res: Response
  ) {
    if (!OAUTH_CONFIG[provider]) {
      throw new BadRequestException('Unsupported provider');
    }

    const redirectUri = this.authService.getRedirectUri(provider);
    const state = this.authService.generateState(redirect);

    const authorizeUrl = this.authService.buildAuthorizeUrl(
      provider,
      redirectUri,
      state
    );

    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // ถ้า prod ให้ใช้ true + https
      maxAge: 5 * 60 * 1000,
    });

    return res.redirect(authorizeUrl);
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: OAuthProviderName,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!code) throw new BadRequestException('Missing code');

    const savedState = (res.req as any).cookies?.['oauth_state'];

    // ตอนนี้ verifyAndDecodeState ต้อง decode ทั้ง redirectUrl + mode (login/link)
    const { redirectUrl, mode } = this.authService.verifyAndDecodeState(
      state,
      savedState
    );

    const redirectUri = this.authService.getRedirectUri(provider);

    // ดึง session ปัจจุบัน (ถ้ามี) จาก cookie
    const cookies = (req as any).cookies ?? {};
    const currentSessionToken =
      (cookies['session_token'] as string | undefined) ?? null;

    const result = await this.authService.handleOAuthCallback({
      provider,
      code,
      redirectUri,
      mode: mode === 'link' ? 'link' : 'login',
      currentSessionToken,
    });

    // ถ้าเป็น "link" mode → ไม่ต้องออก session ใหม่ ใช้ session เดิม แล้วเด้งกลับ /settings
    if (mode === 'link') {
      return res.redirect(redirectUrl ?? '/settings');
    }

    // ปล่อย branch login เดิมของคุณไว้
    const { sessionToken } = result;

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // prod = true + https
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(redirectUrl ?? '/');
  }

  @Get(':provider/link')
  async startLink(
    @Param('provider') provider: OAuthProviderName,
    @Res() res: Response
  ) {
    if (!OAUTH_CONFIG[provider]) {
      throw new BadRequestException('Unsupported provider');
    }

    const frontendBase = process.env.FRONTEND_URL;
    if (!frontendBase) {
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Missing FRONTEND_URL',
        response: null,
        errors: ['FRONTEND_URL is not set in environment variables'],
      });
    }

    const redirectUrl = `${frontendBase.replace(/\/+$/, '')}/settings`;

    const redirectUri = this.authService.getRedirectUri(provider);

    // mark this as "link" mode
    const state = this.authService.generateState(redirectUrl, {
      mode: 'link',
    });

    const authorizeUrl = this.authService.buildAuthorizeUrl(
      provider,
      redirectUri,
      state
    );

    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true in prod + HTTPS
      maxAge: 5 * 60 * 1000,
    });

    return res.redirect(authorizeUrl);
  }

  @Delete(':provider/link')
  @UseGuards(SessionAuthGuard)
  async disconnect(
    @Param('provider') provider: OAuthProviderName,
    @Req() req: any
  ) {
    const prismaProvider = OAUTH_TO_PRISMA_PROVIDER[provider];

    if (!prismaProvider) {
      throw new BadRequestException('Unsupported provider');
    }

    const userId = req.user.id;

    await this.socialLinkService.disconnectProviderForUser({
      userId,
      provider: prismaProvider,
    });

    return {
      status: 'success',
      response: null,
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const cookies = (req as any).cookies ?? {};

    const sessionTokenFromCookie =
      (cookies['session_token'] as string | undefined) ?? null;

    const rawHeaderToken = req.headers['x-session-token'];
    const sessionTokenFromHeader = Array.isArray(rawHeaderToken)
      ? rawHeaderToken[0]
      : rawHeaderToken || null;

    const sessionToken = sessionTokenFromCookie ?? sessionTokenFromHeader;

    if (sessionToken) {
      await this.authService.logoutBySessionToken(sessionToken);
    }

    res.clearCookie('oauth_state', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    res.clearCookie('session_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    return res.send(); // 200/204 ก็ได้
  }
}
