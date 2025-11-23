/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';

@Controller('settings')
@UseGuards(SessionAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthenticated');
    }

    const userId = req.user.id;
    const settings = await this.settingsService.getSettingsForUser(userId);

    return {
      status: 'success',
      response: settings,
    };
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: any,
    @Body() body: { name?: string; lastName?: string }
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthenticated');
    }

    const userId = req.user.id;
    const updated = await this.settingsService.updateProfile(userId, body);

    return {
      status: 'success',
      response: updated,
    };
  }
}
