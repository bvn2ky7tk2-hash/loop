import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProcessDefinitionsModule } from './definitions/process-definitions.module';
import { ProcessInstancesModule } from './instances/process-instances.module';
import { ProcessUserTasksModule } from './user-tasks/process-user-tasks.module';
import { BpmnEngineService } from './engine/bpmn-engine.service';
import { TimerEventService } from './timers/timer-event.service';
import { EscalationTask } from './escalation.task';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcessEventBus } from './process-event-bus.service';
import { DelegationModule } from '../delegation/delegation.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationsModule,
    ProcessDefinitionsModule,
    ProcessInstancesModule,
    ProcessUserTasksModule,
    DelegationModule,
  ],
  providers: [BpmnEngineService, TimerEventService, ProcessEventBus, EscalationTask],
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
