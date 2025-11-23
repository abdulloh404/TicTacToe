/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TicTacToeService } from './tictactoe.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { CreateTicTacToeGameDto } from './interfaces/create-tictactoe-game.interface';

@UseGuards(SessionAuthGuard)
@Controller('tictactoe')
export class TicTacToeController {
  constructor(private readonly service: TicTacToeService) {}

  /**
   * Frontend ยิงมาหลังเกมจบ 1 รอบ
   */
  @Post('games')
  async recordGame(
    @CurrentUser() user: User,
    @Body() dto: CreateTicTacToeGameDto
  ) {
    const result = await this.service.recordGame(user.id, dto);

    return {
      status: 'success',
      response: {
        gameId: result.game.id,
        scoreDelta: result.game.scoreDelta,
        stats: result.stats,
      },
    };
  }

  /**
   * ดู stat ของ user ปัจจุบัน (เอาไปโชว์ใน dashboard)
   */
  @Get('me')
  async getMeStats(@CurrentUser() user: User) {
    const stats = await this.service.getMyStats(user.id);

    return {
      status: 'success',
      response: stats,
    };
  }

  /**
   * scoreboard / leader board ทุก user
   * "เครื่องมือสำหรับตรวจสอบคะแนนของผู้เล่นทั้งหมด"
   */
  @Get('leaderboard')
  async leaderboard(@Query('limit') limit?: string) {
    const rows = await this.service.getLeaderboard(limit ? Number(limit) : 100);

    return {
      status: 'success',
      response: rows.map((row: any) => ({
        userId: row.userId,
        score: row.score,
        totalWins: row.totalWins,
        totalLosses: row.totalLosses,
        totalDraws: row.totalDraws,
        user: row.user,
      })),
    };
  }

  /**
   * ดึงเกมเดียวสำหรับ replay
   */
  @Get('games/:id')
  async getGame(@Param('id') id: string, @CurrentUser() user: User) {
    const game = await this.service.getGameForReplay(id, user.id);

    return {
      status: 'success',
      response: game,
    };
  }

  /**
   * ดึง history เกมของ user ปัจจุบัน (เอาไปโชว์หน้า History) + pagination
   */
  @Get('games')
  async getMyGames(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const pageNum = page ? Number(page) : 1;
    const pageSizeNum = pageSize ? Number(pageSize) : 10;

    const result = await this.service.getUserGames(
      user.id,
      pageNum,
      pageSizeNum
    );

    return {
      status: 'success',
      response: result,
    };
  }
}
