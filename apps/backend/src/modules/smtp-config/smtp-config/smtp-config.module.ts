import { Module } from '@nestjs/common';
import { SmtpConfigController } from './smtp-config.controller';
import { SmtpConfigService } from './smtp-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [SmtpConfigController],
  providers:   [SmtpConfigService],
  exports:     [SmtpConfigService],
})
export class SmtpConfigModule {}
