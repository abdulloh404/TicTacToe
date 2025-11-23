import {
  IsArray,
  IsEnum,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TicTacToeResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
}

export enum TicTacToePlayer {
  HUMAN = 'HUMAN',
  BOT = 'BOT',
}

export class TicTacToeMoveDto {
  @IsInt()
  @Min(1)
  moveOrder!: number;

  @IsEnum(TicTacToePlayer)
  player: TicTacToePlayer | undefined;

  @IsInt()
  @Min(0)
  @Max(8)
  position!: number;
}

export class CreateTicTacToeGameDto {
  @IsEnum(TicTacToeResult)
  result: TicTacToeResult | undefined;

  @IsEnum(TicTacToePlayer)
  startingPlayer: TicTacToePlayer | undefined;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicTacToeMoveDto)
  moves: TicTacToeMoveDto[] = [];
}
