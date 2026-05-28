import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';

@Module({
  imports:     [ScheduleModule.forRoot()],
  controllers: [FeedController],
  providers:   [FeedService],
  exports:     [FeedService],
})
export class FeedModule {}
