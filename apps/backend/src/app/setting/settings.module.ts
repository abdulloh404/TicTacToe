import { Module } from '@nestjs/common';
import { PrismaService } from '@tic-tac-toe/prisma';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService, SessionAuthGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
