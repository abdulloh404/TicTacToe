import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { PrismaService } from '@tic-tac-toe/prisma';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, SessionAuthGuard],
  exports: [UserService],
})
export class UserModule {}
