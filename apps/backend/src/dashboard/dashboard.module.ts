import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardV3Controller } from './dashboard-v3.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisService } from '../common/services/redis.service';
import { DashboardHrProvider } from './providers/dashboard-hr.provider';
import { DashboardFinanceProvider } from './providers/dashboard-finance.provider';
import { DashboardCrmProvider } from './providers/dashboard-crm.provider';
import { DashboardAssetProvider } from './providers/dashboard-asset.provider';
import { DashboardRecruitProvider } from './providers/dashboard-recruit.provider';
import { DashboardWorkProvider } from './providers/dashboard-work.provider';
import { DashboardOpsProvider } from './providers/dashboard-ops.provider';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, DashboardV3Controller],
  // RedisService được export từ CommonModule (@Global) nhưng khai báo tường minh để rõ dependency
  providers: [
    DashboardService,
    RedisService,
    DashboardHrProvider,
    DashboardFinanceProvider,
    DashboardCrmProvider,
    DashboardAssetProvider,
    DashboardRecruitProvider,
    DashboardWorkProvider,
    DashboardOpsProvider,
  ],
})
export class DashboardModule {}
