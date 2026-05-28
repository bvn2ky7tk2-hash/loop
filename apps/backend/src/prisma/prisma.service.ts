import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
      // Mỗi NestJS instance giữ tối đa 20 kết nối DB.
      // Khi scale lên nhiều instance, tổng = instances × DB_POOL_MAX
      // → điều chỉnh DB_POOL_MAX theo số instance để không vượt pg max_connections.
      max:                    parseInt(process.env['DB_POOL_MAX']     ?? '20'),
      idleTimeoutMillis:      parseInt(process.env['DB_IDLE_TIMEOUT'] ?? '30000'),
      connectionTimeoutMillis:parseInt(process.env['DB_CONN_TIMEOUT'] ?? '5000'),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
