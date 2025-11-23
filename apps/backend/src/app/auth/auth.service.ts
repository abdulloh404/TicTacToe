/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { OAuthProviderName } from './types/auth.types';
import { PrismaService } from '@tic-tac-toe/prisma';
import { randomBytes } from 'crypto';
import { URLSearchParams } from 'url';
import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  FRONTEND_FALLBACK_REDIRECT,
  OAUTH_CONFIG,
} from './config/oauth.config';
import { AuthProvider, AuthProviderType, Prisma } from '@prisma/client';
import { SocialLinkService } from './socail-link.service';

const providerToAuthProviderEnum: Record<OAuthProviderName, AuthProvider> = {
  google: AuthProvider.GOOGLE,
  facebook: AuthProvider.FACEBOOK,
  line: AuthProvider.LINE,
  okta: AuthProvider.OKTA,
  auth0: AuthProvider.AUTH0,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialLinkService: SocialLinkService
  ) {}

  getRedirectUri(provider: OAuthProviderName) {
    const apiBaseUrlFromEnv = process.env.BACKEND_URL;

    // ถ้าไม่ได้ตั้งค่า BACKEND_URL ให้ throw 500 ทันที
    if (!apiBaseUrlFromEnv) {
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Missing BACKEND_URL',
        response: null,
        errors: ['BACKEND_URL is not set in environment variables'],
      });
    }

    return `${apiBaseUrlFromEnv}/api/v1/auth/${provider}/callback`;
  }

  generateState(redirectUrl?: string, extra?: { mode?: 'login' | 'link' }) {
    const stateNonce = randomBytes(16).toString('hex');
    const statePayload = {
      nonce: stateNonce,
      redirectUrl: redirectUrl || FRONTEND_FALLBACK_REDIRECT,
      mode: extra?.mode ?? 'login', // default = login
    };

    const encodedState = Buffer.from(JSON.stringify(statePayload)).toString(
      'base64url'
    );

    return encodedState;
  }

  normalizeProfile(provider: OAuthProviderName, providerRawProfile: any): any {
    switch (provider) {
      case 'google':
        console.log('Provider:', provider, providerRawProfile);
        return {
          providerAccountId: providerRawProfile.sub ?? providerRawProfile.id,
          email: providerRawProfile.email,
          name: providerRawProfile.given_name,
          lastName: providerRawProfile.family_name,
          picture: providerRawProfile.picture,
        };

      case 'facebook':
        return {
          providerAccountId: providerRawProfile.id,
          email: providerRawProfile.email,
          name: providerRawProfile.name,
          picture: providerRawProfile.picture?.data?.url,
        };

      case 'line':
        return {
          providerAccountId:
            providerRawProfile.userId ?? providerRawProfile.sub,
          name: providerRawProfile.displayName,
          picture: providerRawProfile.pictureUrl,
        };

      case 'okta':
      case 'auth0':
        return {
          providerAccountId: providerRawProfile.sub,
          email: providerRawProfile.email,
          name: providerRawProfile.name,
          picture: providerRawProfile.picture,
        };

      default:
        // ถ้า provider ไม่รองรับใน normalize -> 400
        throw new BadRequestException({
          status: 'error',
          message: 'Unsupported provider in normalizeProfile',
          response: null,
          errors: [`provider: ${provider}`],
        });
    }
  }

  verifyAndDecodeState(
    state: string,
    savedState?: string | null
  ): { redirectUrl: string; mode: 'login' | 'link' } {
    if (!state) {
      throw new BadRequestException({
        status: 'error',
        message: 'Missing state',
        response: null,
        errors: ['state query param is required'],
      });
    }

    if (savedState && state !== savedState) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid state',
        response: null,
        errors: ['state mismatch'],
      });
    }

    try {
      const decodedJsonString = Buffer.from(state, 'base64url').toString(
        'utf8'
      );

      const parsedStatePayload = JSON.parse(decodedJsonString) as {
        nonce: string;
        redirectUrl?: string;
        mode?: 'login' | 'link';
      };

      const redirectUrl: string =
        parsedStatePayload.redirectUrl ?? FRONTEND_FALLBACK_REDIRECT ?? '/';

      const mode: 'login' | 'link' =
        parsedStatePayload.mode === 'link' ? 'link' : 'login';

      return { redirectUrl, mode };
    } catch (error) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid state format',
        response: null,
        errors: [error],
      });
    }
  }

  buildAuthorizeUrl(
    provider: OAuthProviderName,
    redirectUri: string,
    state: string
  ) {
    const providerConfig = OAUTH_CONFIG[provider];

    // ถ้าไม่มี config ของ provider นี้ -> 400
    if (!providerConfig) {
      throw new BadRequestException({
        status: 'error',
        message: 'Unsupported provider',
        response: null,
        errors: [`provider: ${provider}`],
      });
    }

    const authorizeUrlSearchParams = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: providerConfig.scope,
      state,
    });

    // ถ้า provider ต้องการ extra params ใน authorize (เช่น audience ของ Auth0)
    if (providerConfig.extraAuthParams) {
      Object.entries(providerConfig.extraAuthParams).forEach(([key, value]) => {
        if (value) authorizeUrlSearchParams.set(key, value);
      });
    }

    const fullAuthorizeUrl = `${
      providerConfig.authorizeUrl
    }?${authorizeUrlSearchParams.toString()}`;

    return fullAuthorizeUrl;
  }

  async handleOAuthCallback(params: {
    provider: OAuthProviderName;
    code: string;
    redirectUri: string;
    mode: 'login' | 'link';
    currentSessionToken: string | null;
  }): Promise<{ user: any | null; sessionToken: string | null }> {
    const { provider, code, redirectUri, mode, currentSessionToken } = params;
    const providerConfig = OAUTH_CONFIG[provider];

    if (!providerConfig) {
      throw new BadRequestException({
        status: 'error',
        message: 'Unsupported provider',
        response: null,
        errors: [`provider: ${provider}`],
      });
    }

    // 1) exchange code -> token
    let tokenResponseJson: any;
    let accessTokenFromProvider: string;

    try {
      const tokenEndpointResponse = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
        }),
      });

      if (!tokenEndpointResponse.ok) {
        const tokenEndpointErrorText = await tokenEndpointResponse.text();
        throw new BadGatewayException({
          status: 'error',
          message: 'Token exchange failed',
          response: null,
          errors: [tokenEndpointErrorText],
        });
      }

      tokenResponseJson = (await tokenEndpointResponse.json()) as any;
      accessTokenFromProvider = tokenResponseJson.access_token as string;

      if (!accessTokenFromProvider) {
        throw new BadGatewayException({
          status: 'error',
          message: 'Token exchange failed',
          response: null,
          errors: ['Missing access_token in token response'],
        });
      }
    } catch (error) {
      // ถ้าเป็น HttpException ที่เราสร้างเองด้านบนอยู่แล้ว -> ทิ้งให้มันเด้งต่อ
      if (error instanceof HttpException) {
        throw error;
      }

      // กรณี error อื่น ๆ เช่น network พัง, JSON parse พัง -> 502
      throw new BadGatewayException({
        status: 'error',
        message: 'Unexpected error while exchanging token',
        response: null,
        errors: [error],
      });
    }

    // 2) ใช้ access_token ดึง user profile
    let rawUserProfileFromProvider: any;

    try {
      const userInfoEndpointResponse = await fetch(providerConfig.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessTokenFromProvider}`,
        },
      });

      if (!userInfoEndpointResponse.ok) {
        const userInfoErrorText = await userInfoEndpointResponse.text();
        throw new BadGatewayException({
          status: 'error',
          message: 'Failed to fetch user profile',
          response: null,
          errors: [userInfoErrorText],
        });
      }

      rawUserProfileFromProvider =
        (await userInfoEndpointResponse.json()) as any;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadGatewayException({
        status: 'error',
        message: 'Unexpected error while fetching user profile',
        response: null,
        errors: [error],
      });
    }

    const normalizedUserProfile = this.normalizeProfile(
      provider,
      rawUserProfileFromProvider
    );

    const refreshTokenFromProvider = tokenResponseJson.refresh_token as
      | string
      | undefined;
    const expiresAtEpoch =
      tokenResponseJson.expires_in &&
      typeof tokenResponseJson.expires_in === 'number'
        ? Math.floor(Date.now() / 1000) + tokenResponseJson.expires_in
        : undefined;
    const idToken = tokenResponseJson.id_token as string | undefined;
    const scope = tokenResponseJson.scope as string | undefined;
    const tokenType = tokenResponseJson.token_type as string | undefined;

    // 3) LINK MODE
    if (mode === 'link') {
      if (!currentSessionToken) {
        throw new UnauthorizedException('No active session to link');
      }

      const session = await this.prisma.session.findUnique({
        where: { sessionToken: currentSessionToken },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid session');
      }

      await this.socialLinkService.linkProviderForUser({
        userId: session.userId,
        provider: providerToAuthProviderEnum[provider],
        profile: {
          providerAccountId: normalizedUserProfile.providerAccountId,
          email: normalizedUserProfile.email ?? null,
          name: normalizedUserProfile.name ?? null,
          lastName: (normalizedUserProfile as any).lastName ?? null,
          picture: normalizedUserProfile.picture ?? null,
        },
        tokens: {
          accessToken: accessTokenFromProvider,
          refreshToken: refreshTokenFromProvider ?? null,
          idToken: idToken ?? null,
          scope: scope ?? null,
          tokenType: tokenType ?? null,
          expiresAt: expiresAtEpoch ?? null,
        },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: session.userId },
      });

      return { user, sessionToken: currentSessionToken };
    }

    // 4) LOGIN MODE (เหมือนเดิม)
    try {
      const { user, sessionToken } = await this.upsertUserAndCreateSession({
        provider,
        profile: normalizedUserProfile,
        rawProfile: rawUserProfileFromProvider,
        accessToken: accessTokenFromProvider,
        refreshToken: refreshTokenFromProvider,
        expiresAt: expiresAtEpoch,
      });

      // ตรงนี้ยัง return user + sessionToken ดิบ ๆ ให้ controller ไปจัดการ redirect + cookie ต่อ
      return { user, sessionToken };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to create user session',
        response: null,
        errors: [error],
      });
    }
  }

  async upsertUserAndCreateSession(params: {
    provider: OAuthProviderName;
    profile: {
      providerAccountId: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    rawProfile: any;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }) {
    const {
      provider,
      profile: normalizedUserProfile,
      rawProfile: rawUserProfile,
      accessToken: providerAccessToken,
      refreshToken: providerRefreshToken,
      expiresAt: tokenExpiresAtEpoch,
    } = params;

    const authProviderEnumMap: Record<OAuthProviderName, AuthProvider> = {
      google: AuthProvider.GOOGLE,
      facebook: AuthProvider.FACEBOOK,
      line: AuthProvider.LINE,
      okta: AuthProvider.OKTA,
      auth0: AuthProvider.AUTH0,
    };

    const authProviderTypeEnumMap: Record<OAuthProviderName, AuthProviderType> =
      {
        google: AuthProviderType.OAUTH2,
        facebook: AuthProviderType.OAUTH2,
        line: AuthProviderType.OAUTH2,
        okta: AuthProviderType.OIDC,
        auth0: AuthProviderType.OIDC,
      };

    const prismaProvider = authProviderEnumMap[provider];
    const prismaProviderType = authProviderTypeEnumMap[provider];
    const normalizedEmail = normalizedUserProfile.email ?? null;

    try {
      // 1) ถ้าเจอ account เดิมจาก provider + providerAccountId แล้ว → ใช้ user เดิมเสมอ
      const existingAccount = await this.prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: prismaProvider,
            providerAccountId: normalizedUserProfile.providerAccountId,
          },
        },
        include: { user: true },
      });

      let currentUser = existingAccount?.user ?? null;

      if (existingAccount && currentUser) {
        // อัปเดต token ต่าง ๆ ได้ แต่ไม่แตะชื่อ / นามสกุล / อีเมล ของ user
        await this.prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: prismaProvider,
              providerAccountId: normalizedUserProfile.providerAccountId,
            },
          },
          data: {
            email: normalizedEmail ?? existingAccount.email,
            accessToken: providerAccessToken,
            refreshToken: providerRefreshToken ?? existingAccount.refreshToken,
            expiresAt: tokenExpiresAtEpoch ?? existingAccount.expiresAt,
            rawProfileJson: JSON.stringify(rawUserProfile),
          },
        });

        // เคสนี้จะครอบคลุมกรณี: login ด้วย Facebook1 แล้วได้ user เดียวกับที่เคย link ไว้กับ Google
      } else {
        // 2) ยังไม่มี account จาก provider+accountId นี้
        //    ถ้า email ซ้ำ user เดิม → ผูก provider ใหม่เข้ากับ user นั้น
        //    (แต่ไม่ overwrite โปรไฟล์เดิม)
        if (!currentUser && normalizedEmail) {
          currentUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
        }

        if (currentUser) {
          // มี user อยู่แล้ว → สร้าง Account แถวใหม่ของ provider นี้ให้ user เดิม
          await this.prisma.account.create({
            data: {
              userId: currentUser.id,
              provider: prismaProvider,
              providerType: prismaProviderType,
              providerAccountId: normalizedUserProfile.providerAccountId,
              email: normalizedEmail,
              accessToken: providerAccessToken,
              refreshToken: providerRefreshToken,
              expiresAt: tokenExpiresAtEpoch,
              rawProfileJson: JSON.stringify(rawUserProfile),
            },
          });
        } else {
          // 3) เคส user ใหม่จริง ๆ → สร้าง user + account พร้อมกัน
          switch (provider) {
            case 'google': {
              const googleEmail = normalizedEmail;
              const googleGivenName =
                rawUserProfile.given_name ??
                rawUserProfile.givenName ??
                normalizedUserProfile.name ??
                googleEmail;

              const googleFamilyName =
                rawUserProfile.family_name ?? rawUserProfile.familyName ?? null;

              const googleDisplayName =
                normalizedUserProfile.name ??
                ([googleGivenName, googleFamilyName]
                  .filter(Boolean)
                  .join(' ') ||
                  googleEmail);

              const googlePictureUrl =
                normalizedUserProfile.picture ?? rawUserProfile.picture ?? null;

              currentUser = await this.prisma.user.create({
                data: {
                  email: googleEmail,
                  name: googleGivenName ?? googleDisplayName,
                  lastName: googleFamilyName,
                  picture: googlePictureUrl,
                },
              });
              break;
            }

            case 'facebook': {
              const facebookEmail = normalizedEmail;
              const facebookName =
                normalizedUserProfile.name ??
                rawUserProfile.name ??
                facebookEmail ??
                `facebook:${normalizedUserProfile.providerAccountId}`;

              const facebookPictureUrl =
                normalizedUserProfile.picture ??
                rawUserProfile.picture?.data?.url ??
                null;

              currentUser = await this.prisma.user.create({
                data: {
                  email: facebookEmail,
                  name: facebookName,
                  lastName: null,
                  picture: facebookPictureUrl,
                },
              });
              break;
            }

            case 'line': {
              const lineDisplayName =
                normalizedUserProfile.name ??
                rawUserProfile.displayName ??
                `LINE:${normalizedUserProfile.providerAccountId}`;

              const linePictureUrl =
                normalizedUserProfile.picture ??
                rawUserProfile.pictureUrl ??
                null;

              currentUser = await this.prisma.user.create({
                data: {
                  email: normalizedEmail, // ส่วนใหญ่จะเป็น null
                  name: lineDisplayName,
                  lastName: null,
                  picture: linePictureUrl,
                },
              });
              break;
            }

            case 'okta': {
              const oktaEmail = normalizedEmail ?? rawUserProfile.email ?? null;

              const oktaName =
                normalizedUserProfile.name ??
                rawUserProfile.name ??
                rawUserProfile.preferred_username ??
                oktaEmail ??
                `okta:${normalizedUserProfile.providerAccountId}`;

              const oktaPictureUrl =
                normalizedUserProfile.picture ?? rawUserProfile.picture ?? null;

              currentUser = await this.prisma.user.create({
                data: {
                  email: oktaEmail,
                  name: oktaName,
                  lastName: null,
                  picture: oktaPictureUrl,
                },
              });
              break;
            }

            case 'auth0': {
              const auth0Email =
                normalizedEmail ?? rawUserProfile.email ?? null;

              const auth0Name =
                normalizedUserProfile.name ??
                rawUserProfile.name ??
                rawUserProfile.nickname ??
                auth0Email ??
                `auth0:${normalizedUserProfile.providerAccountId}`;

              const auth0PictureUrl =
                normalizedUserProfile.picture ?? rawUserProfile.picture ?? null;

              currentUser = await this.prisma.user.create({
                data: {
                  email: auth0Email,
                  name: auth0Name,
                  lastName: null,
                  picture: auth0PictureUrl,
                },
              });
              break;
            }

            default: {
              const fallbackDisplayName =
                normalizedUserProfile.name ??
                normalizedEmail ??
                `user:${normalizedUserProfile.providerAccountId}`;

              currentUser = await this.prisma.user.create({
                data: {
                  email: normalizedEmail,
                  name: fallbackDisplayName,
                  lastName: null,
                  picture: normalizedUserProfile.picture ?? null,
                },
              });
            }
          }

          // หลังสร้าง user ใหม่แล้ว → สร้าง account ให้ user คนนี้
          await this.prisma.account.create({
            data: {
              userId: currentUser.id,
              provider: prismaProvider,
              providerType: prismaProviderType,
              providerAccountId: normalizedUserProfile.providerAccountId,
              email: normalizedEmail,
              accessToken: providerAccessToken,
              refreshToken: providerRefreshToken,
              expiresAt: tokenExpiresAtEpoch,
              rawProfileJson: JSON.stringify(rawUserProfile),
            },
          });
        }
      }

      // 4) สร้าง session token ของระบบ
      const sessionTokenForApplication = randomBytes(32).toString('hex');
      const sessionExpiresAtDate = new Date();
      sessionExpiresAtDate.setDate(sessionExpiresAtDate.getDate() + 7);

      await this.prisma.session.create({
        data: {
          sessionToken: sessionTokenForApplication,
          userId: currentUser!.id,
          expiresAt: sessionExpiresAtDate,
        },
      });

      return { user: currentUser!, sessionToken: sessionTokenForApplication };
    } catch (error) {
      // ถ้ามีปัญหาในการ persist user/account/session → โยน 500 พร้อมรายละเอียด
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to persist user/account/session',
        response: null,
        errors: [error],
      });
    }
  }

  async logoutBySessionToken(sessionToken: string): Promise<void> {
    if (!sessionToken) return;

    try {
      await this.prisma.session.delete({
        where: { sessionToken },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return;
      }
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to delete session',
        response: null,
        errors: [error],
      });
    }
  }
}
