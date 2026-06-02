import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CrmActivitiesController } from './crm-activities.controller';
import { CrmActivitiesService } from './crm-activities.service';

@Module({
  imports: [PrismaModule],
  controllers: [CrmActivitiesController],
  providers: [CrmActivitiesService],
})
export class CrmActivitiesModule {}
