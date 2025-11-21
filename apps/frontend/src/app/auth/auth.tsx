'use client';

import { useState } from 'react';
import styles from './auth.module.scss';
import Image from 'next/image';

export default function Authenticate() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleLogin = (provider: string) => {
    if (loadingProvider) return;
    setLoadingProvider(provider);

    console.log('Login with', provider);
    setTimeout(() => setLoadingProvider(null), 600);
  };

  const isLoading = (provider: string) => loadingProvider === provider;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Tic-Tac-Toe Login</h1>
        <p className={styles.subtitle}>
          Sign in to start playing against our bot and earn points.
        </p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.button} ${styles.google}`}
            onClick={() => handleLogin('google')}
            disabled={!!loadingProvider}
          >
            <span className={styles.buttonIcon}>
              <Image
                src="/icons/auth/google-icon.svg"
                alt="Google"
                width={24}
                height={24}
              />
            </span>
            <span className={styles.buttonLabel}>
              {isLoading('google') ? 'Connecting…' : 'Continue with Google'}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.facebook}`}
            onClick={() => handleLogin('facebook')}
            disabled={!!loadingProvider}
          >
            <span className={styles.buttonIcon}>
              <Image
                src="/icons/auth/facebook-icon.svg"
                alt="Facebook"
                width={24}
                height={24}
              />
            </span>
            <span className={styles.buttonLabel}>
              {isLoading('facebook') ? 'Connecting…' : 'Continue with Facebook'}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.line}`}
            onClick={() => handleLogin('line')}
            disabled={!!loadingProvider}
          >
            <span className={styles.buttonIcon}>
              <Image
                src="/icons/auth/line-svgrepo.svg"
                alt="Line"
                width={24}
                height={24}
              />
            </span>
            <span className={styles.buttonLabel}>
              {isLoading('line') ? 'Connecting…' : 'Continue with Line'}
            </span>
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            className={`${styles.button} ${styles.okta}`}
            onClick={() => handleLogin('okta')}
            disabled={!!loadingProvider}
          >
            <span className={styles.buttonIcon}>
              <Image
                src="/icons/auth/okta-svgrepo-com.svg"
                alt="Okta"
                width={24}
                height={24}
              />
            </span>
            <span className={styles.buttonLabel}>
              {isLoading('okta') ? 'Connecting…' : 'Continue with Okta'}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.auth0}`}
            onClick={() => handleLogin('auth0')}
            disabled={!!loadingProvider}
          >
            <span className={styles.buttonIcon}>
              <Image
                src="/icons/auth/auth0-svgrepo-com.svg"
                alt="Auth0"
                width={24}
                height={24}
              />
            </span>
            <span className={styles.buttonLabel}>
              {isLoading('auth0') ? 'Connecting…' : 'Continue with Auth0'}
            </span>
          </button>
        </div>

        <p className={styles.footer}>
          This login uses OAuth 2.0 through external providers.
        </p>
      </div>
    </div>
  );
}
