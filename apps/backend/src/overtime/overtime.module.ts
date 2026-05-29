import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessesModule } from '../processes/processes.module';
import { OvertimeService } from './overtime.service';
import { OvertimeController } from './overtime.controller';

@Module({
  imports: [PrismaModule, ProcessesModule],
  providers: [OvertimeService],
  controllers: [OvertimeController],
  exports: [OvertimeService],
})
export class OvertimeModule {}
