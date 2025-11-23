'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import styles from './history.module.scss';
import boardStyles from '../games/games.module.scss';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type TicTacToeResult = 'WIN' | 'LOSS' | 'DRAW';
type TicTacToePlayer = 'HUMAN' | 'BOT';

type ServerStats = {
  score: number;
  currentWinStreak: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
};

type MoveDto = {
  moveOrder: number;
  player: TicTacToePlayer;
  position: number;
};

type HistoryGame = {
  id: string;
  createdAt: string;
  finishedAt: string | null;
  result: TicTacToeResult;
  startingSide: TicTacToePlayer;
  scoreDelta: number;
  moves: MoveDto[];
};

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type CellValue = 'X' | 'O' | null;
const MAX_MOVES = 9;

export default function HistoryPage() {
  // overview
  const [stats, setStats] = useState<ServerStats | null>(null);

  // list + pagination
  const [games, setGames] = useState<HistoryGame[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [loadingList, setLoadingList] = useState(false);

  // replay
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayGame, setReplayGame] = useState<HistoryGame | null>(null);
  const [replayBoard, setReplayBoard] = useState<CellValue[]>(
    Array(9).fill(null)
  );
  const [replayStep, setReplayStep] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);

  //  load overview stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const url = API_BASE
          ? `${API_BASE}/api/v1/tictactoe/me`
          : '/api/v1/tictactoe/me';

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return;

        const json = await res.json();
        setStats(json.response as ServerStats);
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    };

    loadStats();
  }, []);

  //  load games list
  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoadingList(true);

        const urlBase = API_BASE
          ? `${API_BASE}/api/v1/tictactoe/games`
          : '/api/v1/tictactoe/games';

        const res = await fetch(
          `${urlBase}?page=${pagination.page}&pageSize=${pagination.pageSize}`,
          { credentials: 'include' }
        );
        if (!res.ok) return;

        const json = await res.json();
        const { items, pagination: pg } = json.response as {
          items: HistoryGame[];
          pagination: Pagination;
        };

        setGames(items);
        setPagination(pg);
      } catch (e) {
        console.error('Failed to load games', e);
      } finally {
        setLoadingList(false);
      }
    };

    loadGames();
  }, [pagination.page, pagination.pageSize]);

  const openReplay = async (gameId: string) => {
    try {
      const urlBase = API_BASE
        ? `${API_BASE}/api/v1/tictactoe/games/${gameId}`
        : `/api/v1/tictactoe/games/${gameId}`;

      const res = await fetch(urlBase, { credentials: 'include' });
      if (!res.ok) return;

      const json = await res.json();
      const game = json.response as HistoryGame;

      setReplayGame(game);
      setReplayBoard(Array(9).fill(null));
      setReplayStep(0);
      setReplayOpen(true);
      setReplayPlaying(true);
    } catch (e) {
      console.error('Failed to load game for replay', e);
    }
  };

  const closeReplay = () => {
    setReplayOpen(false);
    setReplayPlaying(false);
    setReplayGame(null);
    setReplayBoard(Array(9).fill(null));
    setReplayStep(0);
  };

  // auto-play moves (รีเพลย์)
  useEffect(() => {
    if (!replayOpen || !replayPlaying || !replayGame) return;

    // sanitize moves: เอาเฉพาะ position 0–8 และจำกัดไม่เกิน 9 ขั้น
    const safeMoves: MoveDto[] =
      replayGame.moves
        ?.filter(
          (m) =>
            m &&
            typeof m.position === 'number' &&
            m.position >= 0 &&
            m.position < 9
        )
        .sort((a, b) => a.moveOrder - b.moveOrder)
        .slice(0, MAX_MOVES) ?? [];

    if (replayStep >= safeMoves.length) return;

    const timeout = setTimeout(() => {
      const move = safeMoves[replayStep];
      if (!move) return;

      const mark: 'X' | 'O' = move.player === 'HUMAN' ? 'X' : 'O';

      setReplayBoard((prev) => {
        const next = [...prev];
        next[move.position] = mark;
        return next;
      });

      setReplayStep((prev) => prev + 1);
    }, 650);

    return () => clearTimeout(timeout);
  }, [replayOpen, replayPlaying, replayStep, replayGame]);

  const restartReplay = () => {
    if (!replayGame) return;
    setReplayBoard(Array(9).fill(null));
    setReplayStep(0);
    setReplayPlaying(true);
  };

  const formatResultLabel = (r: TicTacToeResult) =>
    r === 'WIN' ? 'Win' : r === 'LOSS' ? 'Loss' : 'Draw';

  const formatResultClass = (r: TicTacToeResult) =>
    r === 'WIN'
      ? styles.resultWin
      : r === 'LOSS'
      ? styles.resultLoss
      : styles.resultDraw;

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Step points (ใช้ moves ที่ sanitize แล้ว)
  const safeMoveCount =
    replayGame?.moves
      ?.filter(
        (m) =>
          m &&
          typeof m.position === 'number' &&
          m.position >= 0 &&
          m.position < 9
      )
      .slice(0, MAX_MOVES).length ?? 0;

  const appliedMoves = replayBoard.filter((cell) => cell !== null).length;

  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  return (
    <AppShell>
      <section className={styles.content}>
        {/* Overview top */}
        <div className={styles.overviewRow}>
          <div className={styles.overviewCard}>
            <div className={styles.overviewHeader}>
              <h1 className={styles.heading}>Game history</h1>
              <p className={styles.subheading}>
                View your past Tic-Tac-Toe games and how your score changed.
              </p>
            </div>

            {stats && (
              <div className={styles.overviewGrid}>
                <div className={styles.overviewMain}>
                  <span className={styles.overviewLabel}>Total score</span>
                  <span className={styles.overviewScore}>{stats.score}</span>
                  <span className={styles.overviewHint}>
                    Bonus +1 every 3 consecutive wins.
                  </span>
                </div>
                <div className={styles.overviewSide}>
                  <div className={styles.overviewItem}>
                    <span className={styles.overviewItemLabel}>
                      Current win streak
                    </span>
                    <span className={styles.overviewItemValue}>
                      {stats.currentWinStreak}
                    </span>
                  </div>
                  <div className={styles.overviewItem}>
                    <span className={styles.overviewItemLabel}>
                      W / L / D (all time)
                    </span>
                    <span className={styles.overviewItemValue}>
                      {stats.totalWins} / {stats.totalLosses} /{' '}
                      {stats.totalDraws}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div>
              <h2 className={styles.tableTitle}>Game history</h2>
              <p className={styles.tableSubtitle}>
                Each row shows a finished game with score changes. Click
                &quot;Replay&quot; to watch the moves.
              </p>
            </div>
            <div className={styles.tableMeta}>
              <span className={styles.tableMetaText}>
                {pagination.totalItems} games total
              </span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            {loadingList ? (
              <div className={styles.tableEmpty}>Loading history…</div>
            ) : games.length === 0 ? (
              <div className={styles.tableEmpty}>
                No games yet. Play your first Tic-Tac-Toe match!
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Result</th>
                    <th>Started by</th>
                    <th>Moves</th>
                    <th>Score Δ</th>
                    <th>Replay</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <span className={styles.dateText}>
                          {formatDateTime(g.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.resultChip} ${formatResultClass(
                            g.result
                          )}`}
                        >
                          {formatResultLabel(g.result)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.textDim}>
                          {g.startingSide === 'HUMAN' ? 'You' : 'Bot'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.textDim}>
                          {g.moves?.length ?? 0}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.deltaChip} ${
                            g.scoreDelta > 0
                              ? styles.deltaPositive
                              : g.scoreDelta < 0
                              ? styles.deltaNegative
                              : ''
                          }`}
                        >
                          {g.scoreDelta > 0 ? `+${g.scoreDelta}` : g.scoreDelta}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.replayButton}
                          onClick={() => openReplay(g.id)}
                        >
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* pagination */}
          <div className={styles.paginationRow}>
            <div className={styles.paginationInfo}>
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                disabled={!canPrev}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                disabled={!canNext}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>

        {/* Replay overlay */}
        {replayOpen && replayGame && (
          <div className={styles.replayOverlay}>
            <div className={styles.replayModal}>
              <div className={styles.replayHeader}>
                <div>
                  <h3 className={styles.replayTitle}>Game replay</h3>
                  <p className={styles.replaySubtitle}>
                    {formatDateTime(replayGame.createdAt)} ·{' '}
                    {formatResultLabel(replayGame.result)} · Score Δ{' '}
                    {replayGame.scoreDelta > 0
                      ? `+${replayGame.scoreDelta}`
                      : replayGame.scoreDelta}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.replayClose}
                  onClick={closeReplay}
                >
                  ✕
                </button>
              </div>

              <div className={styles.replayBody}>
                <div className={styles.replayBoardWrapper}>
                  <div className={boardStyles.board}>
                    {replayBoard.map((cell, index) => (
                      <div
                        key={index}
                        className={`${boardStyles.cell} ${
                          cell === 'X'
                            ? boardStyles.cellX
                            : cell === 'O'
                            ? boardStyles.cellO
                            : ''
                        }`}
                      >
                        {cell && (
                          <span className={boardStyles.cellMark}>{cell}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.replayControls}>
                  <span className={styles.replayStepText}>
                    {safeMoveCount === 0
                      ? 'No moves in this game'
                      : `Step ${Math.min(
                          appliedMoves,
                          safeMoveCount
                        )} / ${safeMoveCount}`}
                  </span>
                  <div className={styles.replayButtons}>
                    <button
                      type="button"
                      className={styles.replayControlButton}
                      onClick={restartReplay}
                    >
                      Restart
                    </button>
                    <button
                      type="button"
                      className={styles.replayControlButton}
                      onClick={() => setReplayPlaying((v) => !v)}
                      disabled={replayGame.moves.length === 0}
                    >
                      {replayPlaying ? 'Pause' : 'Play'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
