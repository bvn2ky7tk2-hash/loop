import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardV3Controller } from './dashboard-v3.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, DashboardV3Controller],
  // RedisService được export từ CommonModule (@Global) nhưng khai báo tường minh để rõ dependency
  providers: [DashboardService, RedisService],
})
export class DashboardModule {}
