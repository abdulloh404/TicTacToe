/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './dashboard.module.scss';
import { AppShell } from '../components/AppShell';

type TicTacToeResult = 'WIN' | 'LOSS' | 'DRAW';

type ServerStats = {
  score: number;
  currentWinStreak: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
};

type RecentGame = {
  id: string;
  createdAt: string;
  result: TicTacToeResult;
  scoreDelta: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoadingOverview(true);

        // ดึง stats จาก /me
        try {
          const statsUrl = API_BASE
            ? `${API_BASE}/api/v1/tictactoe/me`
            : '/api/v1/tictactoe/me';

          const resStats = await fetch(statsUrl, { credentials: 'include' });

          if (resStats.ok) {
            const json = await resStats.json();
            // backend: { status, response: { score, currentWinStreak, ... } }
            const payload = json.response ?? json;
            setStats(payload as ServerStats);
          } else {
            console.error('Stats request failed', resStats.status);
            setStats(null);
          }
        } catch (err) {
          console.error('Failed to load tictactoe stats', err);
          setStats(null);
        }

        // ดึง recent games จาก /games
        try {
          const gamesUrl = API_BASE
            ? `${API_BASE}/api/v1/tictactoe/games?page=1&pageSize=5`
            : '/api/v1/tictactoe/games?page=1&pageSize=5';

          const resGames = await fetch(gamesUrl, {
            credentials: 'include',
          });

          if (!resGames.ok) {
            console.error('Games request failed', resGames.status);
            setRecentGames([]);
          } else {
            const json = await resGames.json();
            // จากตัวอย่าง: { status, response: { items: [...], pagination: {...} } }
            const payload = json.response ?? json;
            const items: any[] = Array.isArray(payload.items)
              ? payload.items
              : [];

            const mapped: RecentGame[] = items.map((g) => {
              const createdAt =
                g.createdAt ??
                g.created_at ??
                g.finishedAt ??
                g.finished_at ??
                new Date().toISOString();

              const scoreDelta =
                typeof g.scoreDelta === 'number'
                  ? g.scoreDelta
                  : typeof g.score_delta === 'number'
                  ? g.score_delta
                  : 0;

              return {
                id: String(g.id),
                createdAt,
                result: g.result as TicTacToeResult,
                scoreDelta,
              };
            });

            // เอา 5 เกมล่าสุดพอ
            setRecentGames(mapped.slice(0, 5));
          }
        } catch (err) {
          console.error('Failed to load tictactoe games', err);
          setRecentGames([]);
        }
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchOverview();
  }, []);

  const formatResultLabel = (result: TicTacToeResult) => {
    if (result === 'WIN') return 'Win';
    if (result === 'LOSS') return 'Loss';
    return 'Draw';
  };

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('th-TH', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppShell>
      <section className={styles.content}>
        <div className={styles.contentHeader}>
          <h1 className={styles.heading}>Welcome back 👋</h1>
          <p className={styles.subheading}>
            Choose <strong>Tic-Tac-Toe Game</strong> from the sidebar to start a
            new match, or review your game history.
          </p>
        </div>

        <div className={styles.cards}>
          {/* LEFT COLUMN: start game + history overview */}
          <div className={styles.leftColumn}>
            <div className={styles.primaryCard}>
              <h2 className={styles.cardTitle}>Start a new game</h2>
              <p className={styles.cardDescription}>
                Play against our bot and collect points for each win.
              </p>
              <Link href="/games" className={styles.primaryButton}>
                Play Tic-Tac-Toe
              </Link>
            </div>

            <div className={styles.historyCard}>
              <div className={styles.historyHeaderRow}>
                <div>
                  <h3 className={styles.historyTitle}>History overview</h3>
                  <p className={styles.historySubtitle}>
                    Quick glance at your points and recent games.
                  </p>
                </div>
                {stats && (
                  <div className={styles.historyScoreBadge}>
                    Score <span>{stats.score}</span>
                  </div>
                )}
              </div>

              {stats && (
                <div className={styles.historyStatsGrid}>
                  <div className={styles.historyStatItem}>
                    <span className={styles.historyStatLabel}>
                      CURRENT WIN STREAK
                    </span>
                    <span className={styles.historyStatValue}>
                      {stats.currentWinStreak} win
                      {stats.currentWinStreak === 1 ? '' : 's'}
                    </span>
                    <span className={styles.historyStatHint}>
                      Bonus +1 point every 3 wins in a row.
                    </span>
                  </div>
                  <div className={styles.historyStatItem}>
                    <span className={styles.historyStatLabel}>
                      TOTAL W / L / D
                    </span>
                    <span className={styles.historyStatValue}>
                      {stats.totalWins} / {stats.totalLosses} /{' '}
                      {stats.totalDraws}
                    </span>
                    <span className={styles.historyStatHint}>
                      Keep playing to climb the leaderboard.
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.historyListHeader}>
                <span className={styles.historyListTitle}>Recent games</span>
                <Link href="/history" className={styles.historyListLink}>
                  View all
                </Link>
              </div>

              {loadingOverview && (
                <p className={styles.historyEmpty}>Loading overview…</p>
              )}

              {!loadingOverview && recentGames.length === 0 && (
                <p className={styles.historyEmpty}>
                  Play your first game to see your history here.
                </p>
              )}

              {!loadingOverview && recentGames.length > 0 && (
                <ul className={styles.historyList}>
                  {recentGames.map((g) => (
                    <li key={g.id} className={styles.historyItem}>
                      <span
                        className={`${styles.historyResultChip} ${
                          g.result === 'WIN'
                            ? styles.historyResultWin
                            : g.result === 'LOSS'
                            ? styles.historyResultLoss
                            : styles.historyResultDraw
                        }`}
                      >
                        {formatResultLabel(g.result)}
                      </span>
                      <span className={styles.historyDate}>
                        {formatDateShort(g.createdAt)}
                      </span>
                      <span className={styles.historyScoreDelta}>
                        {g.scoreDelta > 0 ? `+${g.scoreDelta}` : g.scoreDelta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: quick links + tip */}
          <div className={styles.secondaryColumn}>
            <div className={styles.secondaryCard}>
              <h3 className={styles.secondaryTitle}>Quick links</h3>
              <ul className={styles.linkList}>
                <li>
                  <Link href="/settings">Update profile &amp; avatar</Link>
                </li>
                <li>
                  <Link href="/history">View your recent games</Link>
                </li>
                <li>
                  <Link href="/dashboard">Learn how scoring works</Link>
                </li>
              </ul>
            </div>

            <div className={styles.secondaryCardMuted}>
              <p className={styles.tipLabel}>Tip</p>
              <p className={styles.tipText}>
                You can always click your name in the top-right corner to edit
                your user information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
