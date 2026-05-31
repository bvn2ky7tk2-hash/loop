import { Module } from '@nestjs/common';
import { ProcessUserTasksService } from './process-user-tasks.service';
import { ProcessUserTasksController } from './process-user-tasks.controller';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { ProcessEventBus } from '../process-event-bus.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { DelegationModule } from '../../delegation/delegation.module';

@Module({
  imports: [NotificationsModule, DelegationModule],
  providers: [ProcessUserTasksService, BpmnEngineService, ProcessEventBus],
  controllers: [ProcessUserTasksController],
  exports: [ProcessUserTasksService],
})
export class ProcessUserTasksModule {}
