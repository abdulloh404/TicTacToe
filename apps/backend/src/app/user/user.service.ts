import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@tic-tac-toe/prisma';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // user.service.ts
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        picture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      status: 'success',
      data: user,
    };
  }
}
