import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessesModule } from '../processes/processes.module';
import { HrDecisionsController } from './hr-decisions.controller';
import { HrDecisionsService } from './hr-decisions.service';

@Module({
  imports: [PrismaModule, ProcessesModule],
  controllers: [HrDecisionsController],
  providers: [HrDecisionsService],
  exports: [HrDecisionsService],
})
export class HrDecisionsModule {}
