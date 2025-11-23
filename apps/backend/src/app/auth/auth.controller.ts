/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, Controller, Get } from '@nestjs/common';
import { OAuthProviderName } from './types/auth.types';
import { OAUTH_CONFIG } from './config/oauth.config';
import { Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller(`auth`)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Res() res: Response
  ) {
    if (!code) throw new BadRequestException('Missing code');

    const savedState = (res.req as any).cookies?.['oauth_state'];
    const { redirectUrl } = this.authService.verifyAndDecodeState(
      state,
      savedState
    );

    const redirectUri = this.authService.getRedirectUri(provider);

    // const { user, sessionToken } = await this.authService.handleOAuthCallback({
    const { sessionToken } = await this.authService.handleOAuthCallback({
      provider,
      code,
      redirectUri,
    });

    // set session cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // prod = true + https
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(redirectUrl ?? '/');
  }
}
