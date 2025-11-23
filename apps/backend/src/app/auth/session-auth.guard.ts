/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '@tic-tac-toe/prisma';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const cookies = (req as any).cookies ?? {};

    const cookieToken =
      (cookies['session_token'] as string | undefined) ?? null;

    const rawHeaderToken = req.headers['x-session-token'];
    const headerToken = Array.isArray(rawHeaderToken)
      ? rawHeaderToken[0]
      : rawHeaderToken ?? null;

    const sessionToken = cookieToken ?? headerToken;

    if (!sessionToken) {
      throw new UnauthorizedException('Missing session token');
    }

    const session = await this.prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Invalid session');
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // ผูก user + session เข้า req
    (req as any).user = session.user;
    (req as any).session = session;

    return true;
  }
}
