/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@tic-tac-toe/prisma';
import {
  CreateTicTacToeGameDto,
  TicTacToeResult,
} from './interfaces/tictactoe-game.interface';

@Injectable()
export class TicTacToeService {
  constructor(private readonly prisma: PrismaService) {}

  async recordGame(userId: string, dto: CreateTicTacToeGameDto) {
    return this.prisma.$transaction(async (tx: any) => {
      // 1) หา / สร้าง stat เริ่มต้นของ user
      const stat = await tx.ticTacToeStat.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      let scoreDelta = 0;
      let currentWinStreak = stat.currentWinStreak;
      let totalWins = stat.totalWins;
      let totalLosses = stat.totalLosses;
      let totalDraws = stat.totalDraws;

      // 2) คำนวณตาม result
      if (dto.result === TicTacToeResult.WIN) {
        // ชนะ: +1 คะแนน
        scoreDelta += 1;
        currentWinStreak += 1;
        totalWins += 1;

        // ชนะติดกันครบ 3 → โบนัส +1 และรีเซ็ต streak
        if (currentWinStreak >= 3) {
          scoreDelta += 1; // โบนัส 1 คะแนน
          currentWinStreak = 0; // นับใหม่
        }
      } else if (dto.result === TicTacToeResult.LOSS) {
        // แพ้: -1
        scoreDelta -= 1;
        currentWinStreak = 0;
        totalLosses += 1;
      } else {
        // DRAW: ไม่ + ไม่ -, แต่ streak หลุด
        currentWinStreak = 0;
        totalDraws += 1;
      }

      const newScore = stat.score + scoreDelta;

      // 3) อัปเดต stat
      const updatedStat = await tx.ticTacToeStat.update({
        where: { userId },
        data: {
          score: newScore,
          currentWinStreak,
          totalWins,
          totalLosses,
          totalDraws,
        },
      });

      // 4) สร้าง Game + Moves สำหรับ replay
      const game = await tx.ticTacToeGame.create({
        data: {
          userId,
          result: dto.result,
          startingSide: dto.startingPlayer,
          scoreDelta,
          finishedAt: new Date(),
          moves: {
            createMany: {
              data: dto.moves.map((m) => ({
                moveOrder: m.moveOrder,
                player: m.player,
                position: m.position,
              })),
            },
          },
        },
        include: {
          moves: {
            orderBy: { moveOrder: 'asc' },
          },
        },
      });

      return { game, stats: updatedStat };
    });
  }

  async getMyStats(userId: string) {
    const stat = await this.prisma.ticTacToeStat.findUnique({
      where: { userId },
    });

    if (!stat) {
      return {
        score: 0,
        currentWinStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        totalDraws: 0,
      };
    }

    return stat;
  }

  async getLeaderboard(limit = 100) {
    const rows = await this.prisma.ticTacToeStat.findMany({
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            lastName: true,
            picture: true,
          },
        },
      },
    });

    return rows;
  }

  async getGameForReplay(gameId: string, userId: string) {
    // ป้องกันการดูเกมของคนอื่น (ถ้าไม่อยากให้ดูข้าม user)
    return this.prisma.ticTacToeGame.findFirst({
      where: { id: gameId, userId },
      include: {
        moves: {
          orderBy: { moveOrder: 'asc' },
        },
      },
    });
  }

  async getUserGames(userId: string, page = 1, pageSize = 10) {
    const safePage = page < 1 ? 1 : page;
    const safePageSize = Math.min(Math.max(pageSize, 1), 50); // กันไม่ให้ pageSize ใหญ่ไป
    const skip = (safePage - 1) * safePageSize;

    const [total, games] = await this.prisma.$transaction([
      this.prisma.ticTacToeGame.count({
        where: { userId },
      }),
      this.prisma.ticTacToeGame.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePageSize,
        include: {
          moves: {
            orderBy: { moveOrder: 'asc' },
          },
        },
      }),
    ]);

    const totalPages = total === 0 ? 1 : Math.ceil(total / safePageSize);

    return {
      items: games,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        totalItems: total,
        totalPages,
      },
    };
  }
}
