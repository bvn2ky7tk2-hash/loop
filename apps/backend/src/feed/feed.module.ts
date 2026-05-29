import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [ScheduleModule.forRoot(), PrismaModule],
  controllers: [FeedController],
  providers:   [FeedService],
  exports:     [FeedService],
})
export class FeedModule {}
