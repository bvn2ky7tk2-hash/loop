import { Module } from '@nestjs/common';
import { ProcessDefinitionsService } from './process-definitions.service';
import { ProcessDefinitionsController } from './process-definitions.controller';

@Module({
  providers: [ProcessDefinitionsService],
  controllers: [ProcessDefinitionsController],
  exports: [ProcessDefinitionsService],
})
export class ProcessDefinitionsModule {}
