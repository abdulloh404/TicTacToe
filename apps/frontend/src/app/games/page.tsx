'use client';

import { useEffect, useState } from 'react';
import styles from './games.module.scss';
import Link from 'next/link';
import Image from 'next/image';

type Player = 'X' | 'O';
type CellValue = Player | null;

type GameStatus = 'playing' | 'win' | 'lose' | 'draw';
type CoinPhase = 'idle' | 'flipping' | 'result';

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
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });

  // coin toss state
  const [hasFirstPlayer, setHasFirstPlayer] = useState(false);
  const [coinPhase, setCoinPhase] = useState<CoinPhase>('idle');
  const [coinWinner, setCoinWinner] = useState<'human' | 'bot' | null>(null);

  // overlay win/lose/draw
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  const isGameOver = status !== 'playing';

  const handleCellClick = (index: number) => {
    if (isGameOver) return;
    if (!hasFirstPlayer || coinPhase !== 'idle') return;
    if (currentPlayer !== 'X') return;
    if (board[index] !== null) return;

    const nextBoard = [...board];
    nextBoard[index] = 'X';

    const { winner, line } = evaluateBoard(nextBoard);

    if (winner === 'X') {
      setBoard(nextBoard);
      setStatus('win');
      setHighlightLine(line);
      setStats((prev) => ({ ...prev, wins: prev.wins + 1 }));
      return;
    }

    const isFull = nextBoard.every((cell) => cell !== null);
    if (isFull) {
      setBoard(nextBoard);
      setStatus('draw');
      setHighlightLine(null);
      setStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
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
        const index = chooseBotMove(prevBoard);
        if (index === null) {
          return prevBoard;
        }

        const nextBoard = [...prevBoard];
        nextBoard[index] = 'O';

        const { winner, line } = evaluateBoard(nextBoard);

        if (winner === 'O') {
          setStatus('lose');
          setHighlightLine(line);
          setStats((prev) => ({ ...prev, losses: prev.losses + 1 }));
          setCurrentPlayer('X');
          return nextBoard;
        }

        const isFull = nextBoard.every((cell) => cell !== null);
        if (isFull) {
          setStatus('draw');
          setHighlightLine(null);
          setStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
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
    setBoard(Array(9).fill(null));
    setStatus('playing');
    setHighlightLine(null);
    setHasFirstPlayer(false);
    setCoinWinner(null);

    const flipDuration = 900;
    const resultDuration = 900;
    const winner: 'human' | 'bot' = Math.random() < 0.5 ? 'human' : 'bot';

    setCoinPhase('flipping');

    setTimeout(() => {
      setCoinWinner(winner);
      setCoinPhase('result');

      setTimeout(() => {
        setHasFirstPlayer(true);
        setCurrentPlayer(winner === 'human' ? 'X' : 'O');
        setCoinPhase('idle');
        setCoinWinner(null);
      }, resultDuration);
    }, flipDuration);
  };

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

  const renderStatusText = () => {
    if (status === 'win') return 'You win!';
    if (status === 'lose') return 'You lose!';
    if (status === 'draw') return 'It&apos;s a draw';

    if (!hasFirstPlayer) return 'Tap "Start game" to flip the coin';

    return currentPlayer === 'X' ? 'Your turn (X)' : "Bot's turn (O)";
  };

  return (
    <div className={styles.page}>
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

        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logoMark}>
              <Image
                src="/icons/tic-tac-toe-icon.png"
                alt="Tic-Tac-Toe Logo"
                width={28}
                height={28}
              />
            </div>
            <div>
              <h1 className={styles.title}>Tic-Tac-Toe Game</h1>
              <p className={styles.subtitle}>
                Play against our bot. X is you, O is the bot.
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <Link href="/dashboard" className={styles.secondaryButton}>
              ⬅ Back to dashboard
            </Link>
          </div>
        </header>

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
              <h2 className={styles.cardTitle}>Scoreboard</h2>
              <p className={styles.cardSubtitle}>
                Local scores for this session.
              </p>

              <div className={styles.scoreGrid}>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Wins</span>
                  <span className={styles.scoreValue}>{stats.wins}</span>
                </div>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Losses</span>
                  <span className={styles.scoreValue}>{stats.losses}</span>
                </div>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Draws</span>
                  <span className={styles.scoreValue}>{stats.draws}</span>
                </div>
              </div>
            </div>

            <div className={styles.cardMuted}>
              <h3 className={styles.tipTitle}>How it works</h3>
              <ul className={styles.tipList}>
                <li>You are always X, the bot is O.</li>
                <li>Take turns placing marks on the 3×3 grid.</li>
                <li>
                  First to get 3 in a row (line, column or diagonal) wins.
                </li>
                <li>If the board is full and nobody wins, it&apos;s a draw.</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
