import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardV3Controller } from './dashboard-v3.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, DashboardV3Controller],
  providers: [DashboardService],
})
export class DashboardModule {}
