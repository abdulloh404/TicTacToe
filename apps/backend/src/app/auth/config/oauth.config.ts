/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { OAuthProviderName } from '../types/auth.types';

export interface OAuthProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  extraAuthParams?: Record<string, string>;
}

const FRONTEND_DEFAULT_REDIRECT = process.env.FRONTEND_URL;

export const OAUTH_CONFIG: Record<OAuthProviderName, OAuthProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    scope: 'openid email profile',
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
    clientId: process.env.FACEBOOK_CLIENT_ID!,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    scope: 'email public_profile',
  },
  line: {
    authorizeUrl: 'https://access.line.me/oauth2/v2.1/authorize',
    tokenUrl: 'https://api.line.me/oauth2/v2.1/token',
    userInfoUrl: 'https://api.line.me/v2/profile',
    clientId: process.env.LINE_CLIENT_ID!,
    clientSecret: process.env.LINE_CLIENT_SECRET!,
    scope: 'openid profile',
  },
  okta: {
    authorizeUrl: `${process.env.OKTA_ISSUER_URL}/v1/authorize`,
    tokenUrl: `${process.env.OKTA_ISSUER_URL}/v1/token`,
    userInfoUrl: `${process.env.OKTA_ISSUER_URL}/v1/userinfo`,
    clientId: process.env.OKTA_CLIENT_ID!,
    clientSecret: process.env.OKTA_CLIENT_SECRET!,
    scope: 'openid profile email',
  },
  auth0: {
    authorizeUrl: `https://${process.env.AUTH0_DOMAIN}/authorize`,
    tokenUrl: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    userInfoUrl: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    scope: 'openid profile email',
    extraAuthParams: {
      audience: process.env.AUTH0_AUDIENCE ?? '',
    },
  },
};

export const FRONTEND_FALLBACK_REDIRECT = FRONTEND_DEFAULT_REDIRECT;
