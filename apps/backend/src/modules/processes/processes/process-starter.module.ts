import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessStarterService } from './process-starter.service';

@Module({
  imports: [PrismaModule],
  providers: [ProcessStarterService],
  exports: [ProcessStarterService],
})
export class ProcessStarterModule {}
