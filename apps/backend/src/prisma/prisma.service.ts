import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
import { ClsService } from 'nestjs-cls';
import { tenantExtension } from '../common/prisma/tenant-extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly cls: ClsService) {
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

    // $extends trả về client MỚI (immutable) → dùng Proxy để mọi `this.prisma.x`
    // tự đi qua tenant-isolation mà KHÔNG phải sửa 200+ service.
    const extended = this.$extends(tenantExtension(this.cls));
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in (extended as object)) return (extended as any)[prop];
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
