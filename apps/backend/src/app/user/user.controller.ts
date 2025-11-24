/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

import { PrismaService } from '@tic-tac-toe/prisma';
import { Response } from 'express';

@Controller(`users`)
@UseGuards(SessionAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService
  ) {}

  @UseGuards(SessionAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.userService.getMe(user.id);
  }

  @Get('me/avatar')
  @Header('Cache-Control', 'public, max-age=86400') // 1 วัน
  async getMyAvatar(@Req() req: any, @Res() res: Response) {
    const userId: string = req.user.id;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { picture: true },
    });

    // ถ้าไม่มีรูปเลย → ส่ง default avatar (เช่นไฟล์ local)
    if (!user.picture) {
      return res.sendFile(
        path.join(process.cwd(), 'assets', 'default-avatar.png')
      );
    }

    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    const avatarPath = path.join(avatarsDir, `${userId}.jpg`);

    await fs.mkdir(avatarsDir, { recursive: true });

    let useLocalFile = false;

    try {
      const stat = await fs.stat(avatarPath);
      const ageMs = Date.now() - stat.mtimeMs;

      // ถ้าอายุน้อยกว่า 1 วัน → ใช้ไฟล์เดิม
      if (ageMs < 24 * 60 * 60 * 1000) {
        useLocalFile = true;
      }
    } catch {
      // ไม่มีไฟล์ → ไปโหลดใหม่
      useLocalFile = false;
    }

    if (!useLocalFile) {
      try {
        const resp = await fetch(user.picture);
        if (!resp.ok) {
          throw new Error(`Upstream error: ${resp.status}`);
        }

        const buffer = Buffer.from(await resp.arrayBuffer());
        await fs.writeFile(avatarPath, buffer);
      } catch (err) {
        // ถ้าโหลดจาก Google พัง เช่น 429 → fallback เป็น default
        return res.sendFile(
          path.join(process.cwd(), 'assets', 'default-avatar.png')
        );
      }
    }

    return res.sendFile(avatarPath);
  }
}
