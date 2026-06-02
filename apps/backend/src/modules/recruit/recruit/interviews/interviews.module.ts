import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [InterviewsService],
  controllers: [InterviewsController],
  exports: [InterviewsService],
})
export class InterviewsModule {}
