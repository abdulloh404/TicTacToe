import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// libs/prisma/src/lib/prisma.service.ts

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this['$connect']();
  }

  async onModuleDestroy() {
    await this['$disconnect']();
  }
}
