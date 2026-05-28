import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessInstancesModule } from '../processes/instances/process-instances.module';
import { OkrController } from './okr.controller';
import { OkrService } from './okr.service';

@Module({
  imports: [PrismaModule, ProcessInstancesModule],
  controllers: [OkrController],
  providers: [OkrService],
})
export class OkrModule {}
