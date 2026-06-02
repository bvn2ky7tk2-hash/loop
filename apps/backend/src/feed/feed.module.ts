import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FeedTask } from './feed.task';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [ScheduleModule.forRoot(), PrismaModule],
  controllers: [FeedController],
  providers:   [FeedService, FeedTask],
  exports:     [FeedService],
})
export class FeedModule {}
