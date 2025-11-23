/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from './settings.module.scss';
import { AppShell } from '../components/AppShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Types
type AuthProvider = 'GOOGLE' | 'FACEBOOK' | 'LINE';

type UserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  lastName: string | null;
  picture: string | null;
};

type LinkedAccount = {
  id: string;
  provider: AuthProvider;
  email: string | null;
  connectedAt: string | null;
};

type SessionSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SettingsResponse = {
  user: UserProfile;
  accounts: LinkedAccount[];
  sessions: SessionSummary[];
};

// Helpers

const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

const providerDisplayName = (p: AuthProvider) => {
  if (p === 'GOOGLE') return 'Google';
  if (p === 'FACEBOOK') return 'Facebook';
  return 'LINE';
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// Component

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const [formName, setFormName] = useState('');
  const [formLastName, setFormLastName] = useState('');

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);

        const res = await fetch(apiUrl('/api/v1/settings/me'), {
          credentials: 'include',
        });

        if (!res.ok) {
          console.error('Failed to load settings', res.status);
          return;
        }

        const json = await res.json();
        const payload: SettingsResponse = (json.response ??
          json) as SettingsResponse;

        const user = payload.user;
        setProfile(user);
        setFormName(user.name ?? '');
        setFormLastName(user.lastName ?? '');

        const accountsRaw = Array.isArray(payload.accounts)
          ? payload.accounts
          : [];

        setAccounts(
          accountsRaw.map((a) => ({
            id: String(a.id),
            provider: a.provider,
            email: a.email ?? null,
            connectedAt: a.connectedAt ?? (a as any).createdAt ?? null,
          }))
        );

        const sessionsRaw = Array.isArray(payload.sessions)
          ? payload.sessions
          : [];

        setSessions(
          sessionsRaw.map((s) => ({
            id: String(s.id),
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            isCurrent: Boolean(s.isCurrent),
          }))
        );
      } catch (err) {
        console.error('Error loading settings', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSavingProfile(true);
      setProfileError(null);

      const res = await fetch(apiUrl('/api/v1/settings/profile'), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName,
          lastName: formLastName,
        }),
      });

      if (!res.ok) {
        console.error('Failed to save profile', res.status);
        setProfileError('Unable to save profile.');
        return;
      }

      const json = await res.json();
      const payload = json.response ?? json;
      const updatedUser: UserProfile | undefined = payload.user;

      if (updatedUser) {
        setProfile(updatedUser);
        setFormName(updatedUser.name ?? '');
        setFormLastName(updatedUser.lastName ?? '');
      }
    } catch (err) {
      console.error('Error saving profile', err);
      setProfileError('An error occurred while saving your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Start social linking flow (redirect to backend OAuth link)
  const handleConnectProvider = (provider: AuthProvider) => {
    const pathMap: Record<AuthProvider, string> = {
      GOOGLE: '/api/v1/auth/google/link',
      FACEBOOK: '/api/v1/auth/facebook/link',
      LINE: '/api/v1/auth/line/link',
    };

    const href = apiUrl(pathMap[provider]);
    window.location.href = href;
  };

  const isProviderLinked = (provider: AuthProvider) =>
    accounts.some((a) => a.provider === provider);

  const getProviderAccount = (provider: AuthProvider) =>
    accounts.find((a) => a.provider === provider) ?? null;

  return (
    <AppShell>
      <section className={styles.content}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.heading}>Account settings</h1>
            <p className={styles.subheading}>
              Manage your profile, connect social accounts, and review your
              active login sessions.
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingBox}>Loading settings…</div>
        ) : (
          <div className={styles.grid}>
            {/* Profile card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Profile</h2>
              <p className={styles.cardSubtitle}>
                You can only edit your name. The initial values came from the
                first social account you linked.
              </p>

              {profile && (
                <div className={styles.profileHeader}>
                  <div className={styles.avatar}>
                    {profile.picture ? (
                      <img
                        src={profile.picture}
                        alt={profile.name ?? 'Avatar'}
                      />
                    ) : (
                      <span>
                        {(profile.name || profile.lastName || '?')
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={styles.profileMeta}>
                    <div className={styles.profileName}>
                      {profile.name || profile.lastName
                        ? `${profile.name ?? ''} ${
                            profile.lastName ?? ''
                          }`.trim()
                        : 'Unnamed user'}
                    </div>
                    <div className={styles.profileEmail}>
                      {profile.email ?? 'No email'}
                    </div>
                  </div>
                </div>
              )}

              <form className={styles.form} onSubmit={handleSaveProfile}>
                <div className={styles.formRow}>
                  <label className={styles.label} htmlFor="name">
                    First name
                  </label>
                  <input
                    id="name"
                    className={styles.input}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label} htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    className={styles.input}
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>

                {profileError && (
                  <p className={styles.errorText}>{profileError}</p>
                )}

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Social links card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Connected accounts</h2>
              <p className={styles.cardSubtitle}>
                You can link up to three accounts: Google, Facebook, and LINE.
                Your profile info always comes from the first linked social
                account.
              </p>

              <ul className={styles.providerList}>
                {(['GOOGLE', 'FACEBOOK', 'LINE'] as AuthProvider[]).map(
                  (provider) => {
                    const linked = isProviderLinked(provider);
                    const acc = getProviderAccount(provider);

                    return (
                      <li key={provider} className={styles.providerItem}>
                        <div className={styles.providerInfo}>
                          <span className={styles.providerName}>
                            {providerDisplayName(provider)}
                          </span>
                          <span className={styles.providerStatus}>
                            {linked ? 'Connected' : 'Not connected'}
                          </span>
                          {linked && (
                            <>
                              {acc?.email && (
                                <span className={styles.providerEmail}>
                                  {acc.email}
                                </span>
                              )}
                              {acc?.connectedAt && (
                                <span className={styles.providerDate}>
                                  Linked at: {formatDateTime(acc.connectedAt)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className={styles.providerActions}>
                          {linked ? (
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              disabled
                            >
                              Linked
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.primaryButtonGhost}
                              onClick={() => handleConnectProvider(provider)}
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  }
                )}
              </ul>
            </div>

            {/* Sessions card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Login sessions</h2>
              <p className={styles.cardSubtitle}>
                View your active login sessions across devices.
              </p>

              {sessions.length === 0 ? (
                <p className={styles.mutedText}>No active sessions.</p>
              ) : (
                <table className={styles.sessionTable}>
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Expires</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td>{formatDateTime(s.createdAt)}</td>
                        <td>{formatDateTime(s.expiresAt)}</td>
                        <td>
                          {s.isCurrent ? (
                            <span className={styles.currentBadge}>
                              This device
                            </span>
                          ) : (
                            <span className={styles.otherBadge}>
                              Other session
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className={styles.sessionsFooter}>
                <span className={styles.mutedText}>
                  If you want a &quot;Sign out from all devices&quot; button,
                  you can call a backend endpoint here to revoke other sessions.
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
