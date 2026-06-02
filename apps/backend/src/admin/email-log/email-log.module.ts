import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { EmailLogController } from './email-log.controller';
import { EmailLogService } from './email-log.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [EmailLogController],
  providers: [EmailLogService],
})
export class EmailLogModule {}
