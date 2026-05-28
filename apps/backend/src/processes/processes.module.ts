import { Module } from '@nestjs/common';
import { ProcessDefinitionsModule } from './definitions/process-definitions.module';
import { ProcessInstancesModule } from './instances/process-instances.module';
import { ProcessUserTasksModule } from './user-tasks/process-user-tasks.module';
import { BpmnEngineService } from './engine/bpmn-engine.service';
import { TimerEventService } from './timers/timer-event.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcessEventBus } from './process-event-bus.service';

@Module({
  imports: [
    NotificationsModule,
    ProcessDefinitionsModule,
    ProcessInstancesModule,
    ProcessUserTasksModule,
  ],
  providers: [BpmnEngineService, TimerEventService, ProcessEventBus],
  exports: [
    ProcessDefinitionsModule,
    ProcessInstancesModule,
    ProcessUserTasksModule,
    BpmnEngineService,
    TimerEventService,
    ProcessEventBus,
  ],
})
export class ProcessesModule {}
