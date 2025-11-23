'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import styles from '../dashboard/dashboard.module.scss';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type MeResponse = {
  status: string;
  data?: {
    id: string;
    email?: string | null;
    name?: string | null;
    lastName?: string | null;
    picture?: string | null;
  };
};

type AppShellProps = {
  children: ReactNode;
};

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'games', label: 'Games', href: '/games' },
  { key: 'history', label: 'History Games', href: '/history' },
  { key: 'settings', label: 'Setting User', href: '/settings' },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userAreaRef = useRef<HTMLDivElement | null>(null);

  const [userName, setUserName] = useState<string>('Player');
  const [userPicture, setUserPicture] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href;
  };

  // const isActive = (href: string) => {
  //   if (href === '/dashboard') {
  //     // ให้ /dashboard และ /games ใช้เมนู Dashboard ร่วมกัน
  //     return pathname === '/dashboard' || pathname.startsWith('/games');
  //   }

  //   return pathname === href;
  // };

  // close dropdown
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        userAreaRef.current &&
        !userAreaRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // load user profile
  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      try {
        const url = API_BASE
          ? `${API_BASE}/api/v1/users/me`
          : '/api/v1/users/me';

        const res = await fetch(url, {
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Failed to fetch user info');

        const json = (await res.json()) as MeResponse;
        if (cancelled || !json.data) return;

        const { name, lastName, email, picture } = json.data;

        const fullName =
          (lastName ? [name, lastName].filter(Boolean).join(' ') : name) ||
          email ||
          'Player';

        setUserName(fullName);
        setUserPicture(picture ?? null);
      } catch {
        if (!cancelled) {
          setUserName('Player');
          setUserPicture(null);
        }
      }
    };

    loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      router.push('/auth');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarLogoDot}>
              <Image
                src="/icons/tic-tac-toe-icon.png"
                alt="Tic-Tac-Toe Logo"
                width={34}
                height={34}
              />
            </span>
            <span className={styles.sidebarTitle}>Tic-Tac-Toe</span>
          </div>

          <nav className={styles.sidebarNav}>
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`${styles.navItem} ${
                  isActive(item.href) ? styles.navItemActive : ''
                }`}
              >
                <span className={styles.navItemBullet} />
                <span className={styles.navItemLabel}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Area */}
        <main className={styles.main}>
          <header className={styles.navbar}>
            <div className={styles.brand}>
              <span className={styles.brandMark}>
                <Image
                  src="/icons/tic-tac-toe-icon.png"
                  alt="Tic-Tac-Toe Logo"
                  width={34}
                  height={34}
                />
              </span>
              <span className={styles.brandText}>Tic-Tac-Toe Arena</span>
            </div>

            <div className={styles.userArea} ref={userAreaRef}>
              <button
                type="button"
                className={styles.userChip}
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
              >
                {userPicture ? (
                  <span className={styles.userAvatarImageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={userPicture}
                      alt={userName}
                      className={styles.userAvatarImage}
                    />
                  </span>
                ) : (
                  <span className={styles.userAvatar}>
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userChipCaret}>▾</span>
              </button>

              {isUserMenuOpen && (
                <div className={styles.userMenu}>
                  <button
                    type="button"
                    className={styles.userMenuItem}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      router.push('/settings');
                    }}
                  >
                    Profile &amp; Settings
                  </button>

                  <div className={styles.userMenuDivider} />

                  <button
                    type="button"
                    className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* children content */}
          {children}
        </main>
      </div>
    </div>
  );
}
