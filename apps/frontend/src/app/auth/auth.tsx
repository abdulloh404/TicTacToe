'use client';
import styles from './auth.module.scss';

export default function Authenticate() {
  const handleLogin = (provider: string) => {
    console.log('Login with', provider);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Tic-Tac-Toe Login</h1>
        <p className={styles.subtitle}>Choose a provider to sign in</p>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.google}
            onClick={() => handleLogin('google')}
          >
            Continue with Google
          </button>

          <button
            type="button"
            className={styles.facebook}
            onClick={() => handleLogin('facebook')}
          >
            Continue with Facebook
          </button>

          <button
            type="button"
            className={styles.line}
            onClick={() => handleLogin('line')}
          >
            Continue with Line
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            className={styles.okta}
            onClick={() => handleLogin('okta')}
          >
            Continue with Okta
          </button>

          <button
            type="button"
            className={styles.auth0}
            onClick={() => handleLogin('auth0')}
          >
            Continue with Auth0
          </button>
        </div>
      </div>
    </div>
  );
}
