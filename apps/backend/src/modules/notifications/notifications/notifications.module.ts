import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FirebaseService } from './firebase.service';
import { MailService } from './mail.service';
import { NotificationQueueService } from './notification-queue.service';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, FirebaseService, MailService, NotificationQueueService],
  controllers: [NotificationsController],
  exports: [NotificationsService, FirebaseService, MailService, NotificationQueueService],
})
export class NotificationsModule {}
