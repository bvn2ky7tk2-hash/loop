import { Module } from '@nestjs/common';
import { ProcessInstancesService } from './process-instances.service';
import { ProcessInstancesController } from './process-instances.controller';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ProcessInstancesService, BpmnEngineService],
  controllers: [ProcessInstancesController],
  exports: [ProcessInstancesService, BpmnEngineService],
})
export class ProcessInstancesModule {}
