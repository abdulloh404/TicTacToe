import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
// import { PrismaService } from '@tic-tac-toe/prisma';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly appService: AuthService,
    // private readonly prisma: PrismaService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }
}
