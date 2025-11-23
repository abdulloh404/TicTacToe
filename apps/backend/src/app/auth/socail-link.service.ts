/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthProvider, AuthProviderType } from '@prisma/client';
import { PrismaService } from '@tic-tac-toe/prisma';

type SocialProfile = {
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  picture?: string | null;
  providerAccountId: string;
};

@Injectable()
export class SocialLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async linkProviderForUser(params: {
    userId: string;
    provider: AuthProvider; // GOOGLE | FACEBOOK | LINE
    profile: SocialProfile;
    tokens?: {
      accessToken?: string | null;
      refreshToken?: string | null;
      idToken?: string | null;
      scope?: string | null;
      tokenType?: string | null;
      expiresAt?: number | null;
    };
  }) {
    const { userId, provider, profile, tokens } = params;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { accounts: true },
    });

    const alreadyLinked = user.accounts.some((a) => a.provider === provider);
    if (alreadyLinked) {
      return;
    }

    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    });

    if (existingAccount) {
      if (existingAccount.userId === userId) {
        return;
      }

      throw new BadRequestException({
        status: 'error',
        message: 'This social account is already linked to another user.',
        response: null,
        errors: [],
      });
    }

    await this.prisma.account.create({
      data: {
        userId,
        provider,
        providerType: AuthProviderType.OAUTH2,
        providerAccountId: profile.providerAccountId,
        email: profile.email ?? null,
        accessToken: tokens?.accessToken ?? null,
        refreshToken: tokens?.refreshToken ?? null,
        idToken: tokens?.idToken ?? null,
        scope: tokens?.scope ?? null,
        tokenType: tokens?.tokenType ?? null,
        expiresAt: tokens?.expiresAt ?? null,
        rawProfileJson: null,
      },
    });

    if (user.accounts.length === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(profile.name !== undefined ? { name: profile.name } : {}),
          ...(profile.lastName !== undefined
            ? { lastName: profile.lastName }
            : {}),
          ...(profile.picture !== undefined
            ? { picture: profile.picture }
            : {}),
          ...(profile.email !== undefined ? { email: profile.email } : {}),
        },
      });
    }
  }

  async disconnectProviderForUser(params: {
    userId: string;
    provider: AuthProvider;
  }) {
    const { userId, provider } = params;

    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });

    const target = accounts.find((a: any) => a.provider === provider);

    // ไม่ได้เชื่อม provider นี้อยู่แล้ว → เงียบ ๆ
    if (!target) return;

    // กันไม่ให้ถอดอันสุดท้าย เพื่อไม่ให้ user lock ตัวเองออกจากระบบ
    if (accounts.length <= 1) {
      throw new BadRequestException({
        status: 'error',
        message: 'Cannot disconnect the last linked account.',
        response: null,
        errors: [],
      });
    }

    await this.prisma.account.delete({
      where: { id: target.id },
    });
  }
}
