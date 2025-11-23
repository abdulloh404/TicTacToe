import { Module } from '@nestjs/common';
import { PrismaService } from '@tic-tac-toe/prisma';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialLinkService } from './socail-link.service';
@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, SocialLinkService],
})
export class AuthModule {}
