import { Module } from '@nestjs/common';
import { ModuleConfigService } from './module-config.service';
import { ModuleConfigController } from './module-config.controller';

@Module({
  controllers: [ModuleConfigController],
  providers: [ModuleConfigService],
  exports: [ModuleConfigService],
})
export class ModuleConfigModule {}
