'use client';

import { useEffect, useState } from 'react';
import styles from './games.module.scss';
import { AppShell } from '../components/AppShell';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// ฝั่ง frontend
type Player = 'X' | 'O';
type CellValue = Player | null;
type GameStatus = 'playing' | 'win' | 'lose' | 'draw';
type CoinPhase = 'idle' | 'flipping' | 'result';

// แบบเดียวกับ DTO ฝั่ง backend
type ServerResult = 'WIN' | 'LOSS' | 'DRAW';
type ServerPlayer = 'HUMAN' | 'BOT';

type MoveDto = {
  moveOrder: number;
  player: ServerPlayer;
  position: number; // 0-8
};

type ServerStats = {
  score: number;
  currentWinStreak: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
};

const MAX_MOVES = 9;

const winningLines: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function evaluateBoard(board: CellValue[]) {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] as Player,
        line: [a, b, c] as [number, number, number],
      };
    }
  }

  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return { winner: null, line: null as null };
  }

  return { winner: null, line: null as null };
}

function chooseBotMove(board: CellValue[]): number | null {
  const bot: Player = 'O';
  const human: Player = 'X';

  const emptyIndices = board
    .map((cell, index) => (cell === null ? index : -1))
    .filter((index) => index !== -1);

  if (emptyIndices.length === 0) return null;

  // 1) ถ้าบอทมีตาที่ชนะได้เลย → ลงตรงนั้น
  for (const i of emptyIndices) {
    const clone = [...board];
    clone[i] = bot;
    const { winner } = evaluateBoard(clone);
    if (winner === bot) return i;
  }

  // 2) ถ้าคนใกล้จะชนะ → กันก่อน
  for (const i of emptyIndices) {
    const clone = [...board];
    clone[i] = human;
    const { winner } = evaluateBoard(clone);
    if (winner === human) return i;
  }

  // 3) เอากลางก่อน
  if (emptyIndices.includes(4)) return 4;

  // 4) เอามุม
  const corners = [0, 2, 6, 8];
  const emptyCorners = corners.filter((c) => emptyIndices.includes(c));
  if (emptyCorners.length > 0) {
    return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
  }

  // 5) ไม่งั้นก็สุ่มช่องที่เหลือ
  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
}

export default function GamesPage() {
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X'); // X = คน, O = bot
  const [status, setStatus] = useState<GameStatus>('playing');
  const [highlightLine, setHighlightLine] = useState<number[] | null>(null);

  // local stats (session เท่านั้น)
  const [localStats, setLocalStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
  });

  // server stats (จาก backend)
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // coin toss state
  const [hasFirstPlayer, setHasFirstPlayer] = useState(false);
  const [coinPhase, setCoinPhase] = useState<CoinPhase>('idle');
  const [coinWinner, setCoinWinner] = useState<'human' | 'bot' | null>(null);

  // overlay win/lose/draw
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  // ลำดับการเดิน + ฝั่งที่เริ่ม (สำหรับส่งเข้า backend)
  const [moves, setMoves] = useState<MoveDto[]>([]);
  const [startingPlayer, setStartingPlayer] = useState<ServerPlayer | null>(
    null
  );

  const isGameOver = status !== 'playing';

  // โหลด stats จาก backend ตอนเข้าเพจ
  useEffect(() => {
    if (!API_BASE) return;

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/tictactoe/me`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        setServerStats(json.response);
      } catch (err) {
        console.error('Failed to load tictactoe stats', err);
      }
    };

    fetchStats();
  }, []);

  const handleCellClick = (index: number) => {
    if (isGameOver) return;
    if (!hasFirstPlayer || coinPhase !== 'idle') return;
    if (currentPlayer !== 'X') return;
    if (board[index] !== null) return;

    // ใช้จำนวนช่องที่ลงไปแล้วเป็นตัวนับ move
    const occupied = board.filter((c) => c !== null).length;
    if (occupied >= MAX_MOVES) return; // กันไม่ให้เกิน 9 move

    const nextBoard = [...board];
    nextBoard[index] = 'X';

    const nextMoveOrder = occupied + 1;

    // บันทึก move ของคน
    setMoves((prev) => [
      ...prev,
      {
        moveOrder: nextMoveOrder,
        player: 'HUMAN',
        position: index,
      },
    ]);

    const { winner, line } = evaluateBoard(nextBoard);

    if (winner === 'X') {
      setBoard(nextBoard);
      setStatus('win');
      setHighlightLine(line);
      setLocalStats((prev) => ({ ...prev, wins: prev.wins + 1 }));
      return;
    }

    const isFull = nextBoard.every((cell) => cell !== null);
    if (isFull) {
      setBoard(nextBoard);
      setStatus('draw');
      setHighlightLine(null);
      setLocalStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
      return;
    }

    setBoard(nextBoard);
    setCurrentPlayer('O');
    setHighlightLine(null);
  };

  // ให้บอทเล่นเมื่อถึงตา O
  useEffect(() => {
    if (status !== 'playing') return;
    if (!hasFirstPlayer || coinPhase !== 'idle') return;
    if (currentPlayer !== 'O') return;

    const timeout = setTimeout(() => {
      setBoard((prevBoard) => {
        // ใช้จำนวนช่องที่ถูกใช้ก่อนที่บอทจะเดิน
        const occupied = prevBoard.filter((c) => c !== null).length;
        if (occupied >= MAX_MOVES) {
          return prevBoard;
        }

        const index = chooseBotMove(prevBoard);
        if (index === null) {
          return prevBoard;
        }

        const nextBoard = [...prevBoard];
        nextBoard[index] = 'O';

        const nextMoveOrder = occupied + 1;

        // บันทึก move ของบอท
        setMoves((prevMoves) => [
          ...prevMoves,
          {
            moveOrder: nextMoveOrder,
            player: 'BOT',
            position: index,
          },
        ]);

        const { winner, line } = evaluateBoard(nextBoard);

        if (winner === 'O') {
          setStatus('lose');
          setHighlightLine(line);
          setLocalStats((prev) => ({ ...prev, losses: prev.losses + 1 }));
          setCurrentPlayer('X');
          return nextBoard;
        }

        const isFull = nextBoard.every((cell) => cell !== null);
        if (isFull) {
          setStatus('draw');
          setHighlightLine(null);
          setLocalStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
          setCurrentPlayer('X');
          return nextBoard;
        }

        setCurrentPlayer('X');
        setHighlightLine(null);
        return nextBoard;
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentPlayer, status, hasFirstPlayer, coinPhase]);

  // ทอยเหรียญเลือกคนเดินก่อน
  const handleStartGame = () => {
    // รีเซ็ตกระดาน + state เกม
    setBoard(Array(9).fill(null));
    setStatus('playing');
    setHighlightLine(null);
    setHasFirstPlayer(false);
    setCoinWinner(null);
    setMoves([]);
    setStartingPlayer(null);

    const flipDuration = 900;
    const resultDuration = 900;
    const winner: 'human' | 'bot' = Math.random() < 0.5 ? 'human' : 'bot';

    setCoinPhase('flipping');

    setTimeout(() => {
      setCoinWinner(winner);
      setCoinPhase('result');

      setTimeout(() => {
        const firstPlayer: ServerPlayer = winner === 'human' ? 'HUMAN' : 'BOT';

        setHasFirstPlayer(true);
        setStartingPlayer(firstPlayer);
        setCurrentPlayer(firstPlayer === 'HUMAN' ? 'X' : 'O');
        setCoinPhase('idle');
        setCoinWinner(null);
      }, resultDuration);
    }, flipDuration);
  };

  // overlay Win / Lose / Draw
  // overlay Win / Lose / Draw
  useEffect(() => {
    if (status === 'playing') {
      setShowResultOverlay(false);
      return;
    }

    setShowResultOverlay(true);
    const timeout = setTimeout(() => {
      setShowResultOverlay(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [status]);

  // เมื่อเกมจบ → ส่ง result + moves เข้า backend
  useEffect(() => {
    const isFinal = status === 'win' || status === 'lose' || status === 'draw';

    if (!isFinal) return;
    if (!startingPlayer) return;
    if (!API_BASE) return;

    // จำนวนช่องที่มี X/O บนกระดานจริง ๆ
    const filledCount = board.filter((c) => c !== null).length;
    if (filledCount === 0) return;

    // จำกัดจำนวน moves ไม่เกินจำนวนช่องที่ถูกใช้จริง และไม่เกิน 9
    const cleanedMoves: MoveDto[] = [];
    for (const m of moves) {
      if (m.position < 0 || m.position > 8) continue;
      cleanedMoves.push(m);
      if (
        cleanedMoves.length >= filledCount ||
        cleanedMoves.length >= MAX_MOVES
      ) {
        break;
      }
    }

    if (cleanedMoves.length === 0) return;

    const mapResult = (s: GameStatus): ServerResult => {
      if (s === 'win') return 'WIN';
      if (s === 'lose') return 'LOSS';
      return 'DRAW';
    };

    const submit = async () => {
      try {
        setIsSubmitting(true);

        const res = await fetch(`${API_BASE}/api/v1/tictactoe/games`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            result: mapResult(status),
            startingPlayer,
            moves: cleanedMoves,
          }),
        });

        if (!res.ok) {
          console.error('Failed to record game', res.status);
          return;
        }

        const json = await res.json();
        if (json?.response?.stats) {
          setServerStats(json.response.stats as ServerStats);
        }
      } catch (err) {
        console.error('Error recording game', err);
      } finally {
        setIsSubmitting(false);
      }
    };

    submit();
  }, [status, startingPlayer, moves, board]);

  const renderStatusText = () => {
    if (status === 'win') return 'You win!';
    if (status === 'lose') return 'You lose!';
    if (status === 'draw') return 'It’s a draw';

    if (!hasFirstPlayer) return 'Tap "Start game" to flip the coin';

    return currentPlayer === 'X' ? 'Your turn (X)' : "Bot's turn (O)";
  };

  return (
    <AppShell>
      <div className={styles.shell}>
        {/* Coin flip overlay */}
        {coinPhase !== 'idle' && (
          <div className={styles.overlay}>
            <div className={styles.coinModal}>
              {coinPhase === 'flipping' && (
                <>
                  <div className={styles.coin}>
                    <div className={`${styles.coinFace} ${styles.coinFront}`}>
                      You
                    </div>
                    <div className={`${styles.coinFace} ${styles.coinBack}`}>
                      Bot
                    </div>
                  </div>
                  <p className={styles.overlayText}>Flipping coin...</p>
                </>
              )}

              {coinPhase === 'result' && coinWinner && (
                <>
                  <p className={styles.overlayLabel}>First move</p>
                  <p className={styles.overlayValue}>
                    {coinWinner === 'human' ? 'You start!' : 'Bot starts'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Win / Lose / Draw overlay */}
        {showResultOverlay && status !== 'playing' && (
          <div className={styles.resultOverlay}>
            <div
              className={`${styles.resultCard} ${
                status === 'win'
                  ? styles.resultWin
                  : status === 'lose'
                  ? styles.resultLose
                  : styles.resultDraw
              }`}
            >
              <p className={styles.resultText}>
                {status === 'win'
                  ? 'You Win!'
                  : status === 'lose'
                  ? 'You Lose'
                  : "It's a Draw"}
              </p>
            </div>
          </div>
        )}

        {/* เนื้อหาเกม */}
        <main className={styles.main}>
          <section className={styles.boardSection}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Game status</span>
              <span
                className={`${styles.statusText} ${
                  status === 'win'
                    ? styles.statusWin
                    : status === 'lose'
                    ? styles.statusLose
                    : status === 'draw'
                    ? styles.statusDraw
                    : ''
                }`}
              >
                {renderStatusText()}
                {isSubmitting && (
                  <span className={styles.statusSync}> · syncing…</span>
                )}
              </span>
            </div>

            <div className={styles.board}>
              {board.map((cell, index) => {
                const isHighlighted =
                  !!highlightLine && highlightLine.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.cell} ${
                      cell === 'X'
                        ? styles.cellX
                        : cell === 'O'
                        ? styles.cellO
                        : ''
                    } ${isHighlighted ? styles.cellHighlight : ''} ${
                      isGameOver ||
                      cell !== null ||
                      currentPlayer !== 'X' ||
                      !hasFirstPlayer ||
                      coinPhase !== 'idle'
                        ? styles.cellDisabled
                        : ''
                    }`}
                    onClick={() => handleCellClick(index)}
                    disabled={
                      isGameOver ||
                      cell !== null ||
                      currentPlayer !== 'X' ||
                      !hasFirstPlayer ||
                      coinPhase !== 'idle'
                    }
                  >
                    {cell === 'X' && <span className={styles.cellMark}>X</span>}
                    {cell === 'O' && <span className={styles.cellMark}>O</span>}
                  </button>
                );
              })}
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleStartGame}
                disabled={coinPhase !== 'idle'}
              >
                {board.every((cell) => cell === null) && status === 'playing'
                  ? 'Start game'
                  : 'Play again'}
              </button>
            </div>
          </section>

          <section className={styles.sidebarSection}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Session scoreboard</h2>
              <p className={styles.cardSubtitle}>
                Local scores for this browser session.
              </p>

              <div className={styles.scoreGrid}>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Wins</span>
                  <span className={styles.scoreValue}>{localStats.wins}</span>
                </div>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Losses</span>
                  <span className={styles.scoreValue}>{localStats.losses}</span>
                </div>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Draws</span>
                  <span className={styles.scoreValue}>{localStats.draws}</span>
                </div>
              </div>
            </div>

            <div className={styles.cardMuted}>
              <h3 className={styles.tipTitle}>Your global stats</h3>
              {serverStats ? (
                <ul className={styles.tipList}>
                  <li>Score: {serverStats.score}</li>
                  <li>Current win streak: {serverStats.currentWinStreak}</li>
                  <li>
                    W / L / D: {serverStats.totalWins} /{' '}
                    {serverStats.totalLosses} / {serverStats.totalDraws}
                  </li>
                </ul>
              ) : (
                <p className={styles.tipText}>
                  Play a game to start tracking your score.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
