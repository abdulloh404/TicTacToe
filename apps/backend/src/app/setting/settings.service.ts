/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@tic-tac-toe/prisma';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettingsForUser(userId: string) {
    const [user, accounts, sessions] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          lastName: true,
          picture: true,
        },
      }),
      this.prisma.account.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // mark session ตัวล่าสุดเป็น isCurrent = true (อย่างน้อยมีสักอัน)
    const sessionsMapped = sessions.map((s: any, index: any) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: index === 0, // latest = current
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        picture: user.picture,
      },
      accounts: accounts.map((a: any) => ({
        id: a.id,
        provider: a.provider, // 'GOOGLE' | 'FACEBOOK' | 'LINE'
        email: a.email,
        connectedAt: a.createdAt.toISOString(),
      })),
      sessions: sessionsMapped,
    };
  }

  async updateProfile(
    userId: string,
    payload: { name?: string; lastName?: string }
  ) {
    const { name, lastName } = payload;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        picture: true,
      },
    });

    return updated;
  }
}
