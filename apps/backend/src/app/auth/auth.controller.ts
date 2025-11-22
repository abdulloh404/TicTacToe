import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { API_VERSION } from '@tic-tac-toe/constant';

@Controller(`${API_VERSION}/auth`)
export class AuthController {
  constructor(private readonly appService: AuthService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }
}
