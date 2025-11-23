'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './dashboard.module.scss';

const menuItems = [
  {
    key: 'game',
    label: 'Tic-Tac-Toe Game',
    href: '/dashbard',
  },
  {
    key: 'settings',
    label: 'Setting User',
    href: '/dashbard/settings',
  },
  {
    key: 'history',
    label: 'History Games',
    href: '/dashbard/history',
  },
];

export default function DashboardPage() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashbard') {
      return pathname === '/dashbard';
    }
    return pathname === href;
  };

  // TODO: ตรงนี้ค่อยเปลี่ยนมาอ่านจาก session จริงทีหลัง
  const userName = 'Abdulloh Mukem';

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarLogoDot}>TTT</span>
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
              <span className={styles.brandMark}>XO</span>
              <span className={styles.brandText}>Tic-Tac-Toe Arena</span>
            </div>

            <Link href="/dashbard/settings" className={styles.userChip}>
              <span className={styles.userAvatar}>
                {userName.charAt(0).toUpperCase()}
              </span>
              <span className={styles.userName}>{userName}</span>
            </Link>
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
                <Link href="/dashbard" className={styles.primaryButton}>
                  Play Tic-Tac-Toe
                </Link>
              </div>

              <div className={styles.secondaryColumn}>
                <div className={styles.secondaryCard}>
                  <h3 className={styles.secondaryTitle}>Quick links</h3>
                  <ul className={styles.linkList}>
                    <li>
                      <Link href="/dashbard/settings">
                        Update profile & avatar
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashbard/history">
                        View your recent games
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashbard">Learn how scoring works</Link>
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
