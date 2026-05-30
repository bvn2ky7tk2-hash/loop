import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { CrmKpiService } from './crm-kpi.service';
import { CrmKpiController, CrmKpiExtController } from './crm-kpi.controller';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [CrmKpiService],
  controllers: [CrmKpiController, CrmKpiExtController],
  exports: [CrmKpiService],
})
export class CrmKpiModule {}
