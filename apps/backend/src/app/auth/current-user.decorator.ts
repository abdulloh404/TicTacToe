/* eslint-disable @typescript-eslint/no-explicit-any */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return (req as any).user;
  }
);
