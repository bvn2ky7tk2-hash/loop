import { Module } from '@nestjs/common';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [NotificationTemplatesController],
  providers:   [NotificationTemplatesService],
  exports:     [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
