import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessesModule } from '../processes/processes.module';
import { OvertimeService } from './overtime.service';
import { OvertimeController } from './overtime.controller';
import { OvertimeProcessHandlerService } from './overtime-process-handler.service';

@Module({
  imports: [PrismaModule, ProcessesModule],
  providers: [OvertimeService, OvertimeProcessHandlerService],
  controllers: [OvertimeController],
  exports: [OvertimeService],
})
export class OvertimeModule {}
