import { Module } from '@nestjs/common';
import { PrismaModule, PrismaService } from '@tic-tac-toe/prisma';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule {}
