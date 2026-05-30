import { Module } from '@nestjs/common';
import { PortalAdminController, PortalPublicController } from './portal.controller';
import { PortalService } from './portal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PortalAdminController, PortalPublicController],
  providers: [PortalService],
})
export class PortalModule {}
