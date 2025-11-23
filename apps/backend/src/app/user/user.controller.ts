import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';

@Controller(`users`)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(SessionAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.userService.getMe(user.id);
  }
}
