/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
} from '@nestjs/common';
import {
  FRONTEND_FALLBACK_REDIRECT,
  OAUTH_CONFIG,
} from './config/oauth.config';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

  generateState(redirectUrl?: string) {
    const stateNonce = randomBytes(16).toString('hex');
    const statePayload = {
      nonce: stateNonce,
      redirectUrl: redirectUrl || FRONTEND_FALLBACK_REDIRECT,
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

  verifyAndDecodeState(state: string, savedState?: string | null) {
    // ถ้าไม่มี state เลย -> 400
    if (!state) {
      throw new BadRequestException({
        status: 'error',
        message: 'Missing state',
        response: null,
        errors: ['state query param is required'],
      });
    }

    try {
      const decodedJsonString = Buffer.from(state, 'base64url').toString(
        'utf8'
      );

      const parsedStatePayload = JSON.parse(decodedJsonString) as {
        nonce: string;
        redirectUrl?: string;
      };

      // TODO: ถ้าจะเช็ค savedState (จาก cookie) กับ nonce จริง ๆ ทำตรงนี้ได้

      return parsedStatePayload;
    } catch (error) {
      // ถ้า decode / parse ไม่ได้ -> 400 พร้อม detail error
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
  }) {
    const { provider, code, redirectUri } = params;
    const providerConfig = OAUTH_CONFIG[provider];

    // ถ้ารับ provider ที่ไม่รองรับ -> 400
    if (!providerConfig) {
      throw new BadRequestException({
        status: 'error',
        message: 'Unsupported provider',
        response: null,
        errors: [`provider: ${provider}`],
      });
    }

    // ---------- 1) แลก authorization code -> access token ----------
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
        // provider ตอบ error -> 502 (Bad Gateway) เพราะเป็น upstream ล้ม
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
        // กรณีตอบ 200 แต่ไม่มี access_token ก็ถือว่า error จาก upstream เช่นกัน
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

    // ---------- 2) ใช้ access_token ดึง user profile ----------
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

    try {
      const { user, sessionToken } = await this.upsertUserAndCreateSession({
        provider,
        profile: normalizedUserProfile,
        rawProfile: rawUserProfileFromProvider,
        accessToken: accessTokenFromProvider,
        refreshToken: tokenResponseJson.refresh_token as string | undefined,
        expiresAt: tokenResponseJson.expires_in
          ? Math.floor(Date.now() / 1000) + tokenResponseJson.expires_in
          : undefined,
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

    // map provider string → enum Prisma ที่เรานิยามใน schema
    const authProviderEnumMap: Record<OAuthProviderName, string> = {
      google: 'GOOGLE',
      facebook: 'FACEBOOK',
      line: 'LINE',
      okta: 'OKTA',
      auth0: 'AUTH0',
    };

    const authProviderTypeEnumMap: Record<OAuthProviderName, string> = {
      google: 'OAUTH2',
      facebook: 'OAUTH2',
      line: 'OAUTH2',
      okta: 'OIDC',
      auth0: 'OIDC',
    };

    const normalizedEmail = normalizedUserProfile.email ?? null;

    try {
      // 1) หา account เดิมจาก provider + providerAccountId
      const existingOAuthAccount = await this.prisma.account.findFirst({
        where: {
          provider: authProviderEnumMap[provider] as any,
          providerAccountId: normalizedUserProfile.providerAccountId,
        },
        include: { user: true },
      });

      // 2) ถ้ามี account เดิม -> ดึง user จากนั้น
      //    ถ้าไม่มี account แต่มี email -> หา user จาก email
      let currentUser =
        existingOAuthAccount?.user ??
        (normalizedEmail
          ? await this.prisma.user.findUnique({
              where: { email: normalizedEmail },
            })
          : null);

      // 3) ถ้ายังไม่เจอ user -> แยก create ตาม provider
      if (!currentUser) {
        switch (provider) {
          case 'google': {
            // ใช้ข้อมูลจาก Google โดยตรง + normalized
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
              ([googleGivenName, googleFamilyName].filter(Boolean).join(' ') ||
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
            // facebook บางเคสไม่มี email ถ้าไม่ได้ขอ permission
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
            // LINE ส่วนใหญ่ไม่มี email → เน้น displayName + avatar
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
            const auth0Email = normalizedEmail ?? rawUserProfile.email ?? null;

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
            // กันไว้เฉย ๆ ถ้า provider แปลก ๆ หลุดมา
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
            break;
          }
        }
      } else {
        // 4) มี user อยู่แล้ว -> อัปเดตชื่อ / รูป แบบ generic ก่อน
        // ถ้ามึงอยากแยก provider ตอน update ด้วย ค่อยแตก switch ตรงนี้เพิ่มได้เหมือนกัน
        currentUser = await this.prisma.user.update({
          where: { id: currentUser.id },
          data: {
            name: normalizedUserProfile.name ?? currentUser.name,
            picture: normalizedUserProfile.picture ?? currentUser.picture,
          },
        });
      }

      // 5) upsert account (provider + providerAccountId ให้ unique)
      await this.prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: authProviderEnumMap[provider] as any,
            providerAccountId: normalizedUserProfile.providerAccountId,
          },
        },
        create: {
          userId: currentUser.id,
          provider: authProviderEnumMap[provider] as any,
          providerType: authProviderTypeEnumMap[provider] as any,
          providerAccountId: normalizedUserProfile.providerAccountId,
          email: normalizedEmail,
          accessToken: providerAccessToken,
          refreshToken: providerRefreshToken,
          expiresAt: tokenExpiresAtEpoch,
          rawProfileJson: JSON.stringify(rawUserProfile),
        },
        update: {
          email: normalizedEmail,
          accessToken: providerAccessToken,
          refreshToken: providerRefreshToken,
          expiresAt: tokenExpiresAtEpoch,
          rawProfileJson: JSON.stringify(rawUserProfile),
        },
      });

      // 6) สร้าง session token สำหรับระบบของเราเอง
      const sessionTokenForApplication = randomBytes(32).toString('hex');
      const sessionExpiresAtDate = new Date();
      sessionExpiresAtDate.setDate(sessionExpiresAtDate.getDate() + 7); // อายุ session 7 วัน

      await this.prisma.session.create({
        data: {
          sessionToken: sessionTokenForApplication,
          userId: currentUser.id,
          expiresAt: sessionExpiresAtDate,
        },
      });

      return { user: currentUser, sessionToken: sessionTokenForApplication };
    } catch (error) {
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to persist user/account/session',
        response: null,
        errors: [error],
      });
    }
  }
}
