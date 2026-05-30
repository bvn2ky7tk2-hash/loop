import { Module } from '@nestjs/common';
import { ProcessInstancesService } from './process-instances.service';
import { ProcessInstancesController } from './process-instances.controller';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { ProcessEventBus } from '../process-event-bus.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { DelegationModule } from '../../delegation/delegation.module';

@Module({
  imports: [NotificationsModule, DelegationModule],
  providers: [ProcessInstancesService, BpmnEngineService, ProcessEventBus],
  controllers: [ProcessInstancesController],
  exports: [ProcessInstancesService, BpmnEngineService, ProcessEventBus],
})
export class ProcessInstancesModule {}
