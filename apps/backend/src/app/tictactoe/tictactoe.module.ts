import { Module } from '@nestjs/common';
import { TicTacToeController } from './tictactoe.controller';
import { TicTacToeService } from './tictactoe.service';
import { PrismaService } from '@tic-tac-toe/prisma';

@Module({
  imports: [],
  controllers: [TicTacToeController],
  providers: [TicTacToeService, PrismaService],
})
export class TicTacToeModule {}
