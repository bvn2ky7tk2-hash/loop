import { Module } from '@nestjs/common';
import { ProcessUserTasksService } from './process-user-tasks.service';
import { ProcessUserTasksController } from './process-user-tasks.controller';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { ProcessEventBus } from '../process-event-bus.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ProcessUserTasksService, BpmnEngineService, ProcessEventBus],
  controllers: [ProcessUserTasksController],
  exports: [ProcessUserTasksService],
})
export class ProcessUserTasksModule {}
