/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './dashboard.module.scss';

const menuItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    key: 'settings',
    label: 'Setting User',
    href: '/dashboard/settings',
  },
  {
    key: 'history',
    label: 'History Games',
    href: '/dashboard/history',
  },
];

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

export default function DashboardPage() {
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

  // ดึงข้อมูลผู้ใช้
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

        if (!res.ok) {
          throw new Error('Failed to fetch user info');
        }

        const json = (await res.json()) as MeResponse;

        if (cancelled || !json.data) return;

        const { name, lastName, email, picture } = json.data;

        // ถ้า provider มี lastName ก็เอามาต่อกัน
        const fullName =
          (lastName ? [name, lastName].filter(Boolean).join(' ') : name) ||
          email ||
          'Player';

        setUserName(fullName);
        setUserPicture(picture ?? null);
      } catch (error) {
        if (!cancelled) {
          // fallback ถ้าดึงไม่ได้ก็ยังให้มีชื่อ default อยู่
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

  // ปิด popup เวลา click นอกกล่อง หรือกด Esc
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

  const handleLogout = async () => {
    try {
      const url = API_BASE
        ? `${API_BASE}/api/v1/auth/logout`
        : '/api/v1/auth/logout';

      await fetch(url, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout failed', e);
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

            {/* user/profile dropdown */}
            <div className={styles.userArea} ref={userAreaRef}>
              <button
                type="button"
                className={styles.userChip}
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
              >
                <span className={styles.userAvatar}>
                  {userPicture ? (
                    <Image
                      src={userPicture}
                      alt={userName}
                      width={34}
                      height={34}
                      className={styles.userAvatarImage}
                      unoptimized
                    />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </span>
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
                      router.push('/dashboard/settings');
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

          <section className={styles.content}>
            <div className={styles.contentHeader}>
              <h1 className={styles.heading}>Welcome back 👋</h1>
              <p className={styles.subheading}>
                Choose <strong>Tic-Tac-Toe Game</strong> from the sidebar to
                start a new match, or review your game history.
              </p>
            </div>

            <div className={styles.cards}>
              <div className={styles.primaryCard}>
                <h2 className={styles.cardTitle}>Start a new game</h2>
                <p className={styles.cardDescription}>
                  Play against our bot and collect points for each win.
                </p>
                <Link href="/games" className={styles.primaryButton}>
                  Play Tic-Tac-Toe
                </Link>
              </div>

              <div className={styles.secondaryColumn}>
                <div className={styles.secondaryCard}>
                  <h3 className={styles.secondaryTitle}>Quick links</h3>
                  <ul className={styles.linkList}>
                    <li>
                      <Link href="/dashboard/settings">
                        Update profile & avatar
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard/history">
                        View your recent games
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard">Learn how scoring works</Link>
                    </li>
                  </ul>
                </div>

                <div className={styles.secondaryCardMuted}>
                  <p className={styles.tipLabel}>Tip</p>
                  <p className={styles.tipText}>
                    You can always click your name in the top-right corner to
                    edit your user information.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
