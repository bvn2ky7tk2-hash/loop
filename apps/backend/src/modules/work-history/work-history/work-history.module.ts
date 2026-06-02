import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkHistoryController } from './work-history.controller';
import { WorkHistoryService } from './work-history.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkHistoryController],
  providers: [WorkHistoryService],
  exports: [WorkHistoryService],
})
export class WorkHistoryModule {}
