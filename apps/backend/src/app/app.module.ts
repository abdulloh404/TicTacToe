import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TicTacToeModule } from './tictactoe/tictactoe.module';
import { SettingsModule } from './setting/settings.module';

@Module({
  imports: [AuthModule, UserModule, TicTacToeModule, SettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
