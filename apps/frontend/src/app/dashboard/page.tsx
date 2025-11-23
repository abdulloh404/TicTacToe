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

type GameHistoryItem = {
  id: string;
  createdAt: string;
  result: TicTacToeResult;
  scoreDelta: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function DashboardPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameHistoryItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  useEffect(() => {
    if (!API_BASE) return;

    const fetchOverview = async () => {
      try {
        setLoadingOverview(true);

        const [statsRes, gamesRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/tictactoe/me`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE}/api/v1/tictactoe/games?limit=5`, {
            credentials: 'include',
          }),
        ]);

        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStats(statsJson.response);
        }

        if (gamesRes.ok) {
          const gamesJson = await gamesRes.json();
          const games = (gamesJson.response ?? []) as any[];

          setRecentGames(
            games.map((g) => ({
              id: g.id,
              createdAt: g.createdAt,
              result: g.result as TicTacToeResult,
              scoreDelta: g.scoreDelta as number,
            }))
          );
        }
      } catch (e) {
        console.error('Failed to load tictactoe overview', e);
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
                      Current win streak
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
                      Total W / L / D
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
                  <Link href="/settings">Update profile & avatar</Link>
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
