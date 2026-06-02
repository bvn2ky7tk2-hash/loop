import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../integrations/telegram/telegram.module';
import { TasksModule } from '../tasks/tasks.module';
import { BugsService } from './bugs.service';
import { BugAttachmentService } from './bug-attachment.service';
import { BugStatsService } from './bug-stats.service';
import { BugCommentService } from './bug-comment.service';
import { BugsController } from './bugs.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, TelegramModule, TasksModule],
  providers: [BugsService, BugAttachmentService, BugStatsService, BugCommentService],
  controllers: [BugsController],
  exports: [BugsService, BugAttachmentService, BugStatsService, BugCommentService],
})
export class BugsModule {}
