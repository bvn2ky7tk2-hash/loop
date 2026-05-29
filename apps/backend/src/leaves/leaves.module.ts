import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { LeaveProcessHandlerService } from './leave-process-handler.service';
import { ProcessesModule } from '../processes/processes.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ProcessesModule, NotificationsModule],
  providers: [LeavesService, LeaveProcessHandlerService],
  controllers: [LeavesController],
  exports: [LeavesService],
})
export class LeavesModule {}
