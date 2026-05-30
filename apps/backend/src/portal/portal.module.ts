import { Module } from '@nestjs/common';
import { PortalAdminController, PortalPublicController, PortalTicketController } from './portal.controller';
import { PortalService } from './portal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PortalAdminController, PortalPublicController, PortalTicketController],
  providers: [PortalService],
})
export class PortalModule {}
