import { Module } from '@nestjs/common';
import { HrEventBus } from './hr-event-bus.service';
import { ProjectEventBus } from './project-event-bus.service';

@Module({
  providers: [HrEventBus, ProjectEventBus],
  exports: [HrEventBus, ProjectEventBus],
})
export class EventsModule {}
