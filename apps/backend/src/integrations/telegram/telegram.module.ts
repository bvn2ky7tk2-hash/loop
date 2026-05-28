import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegramCardBuilder } from './telegram-card.builder';
import { TelegramPollerService } from './telegram-poller.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramCardBuilder, TelegramPollerService],
  exports: [TelegramService, TelegramCardBuilder],
})
export class TelegramModule {}
