import { Module } from '@nestjs/common';
import { VehicleBookingService } from './vehicle-booking.service';
import { VehicleBookingController } from './vehicle-booking.controller';
import { VehicleProcessHandlerService } from './vehicle-process-handler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessesModule } from '../processes/processes.module';

@Module({
  imports: [PrismaModule, ProcessesModule],
  controllers: [VehicleBookingController],
  providers: [VehicleBookingService, VehicleProcessHandlerService],
  exports: [VehicleBookingService],
})
export class VehicleBookingModule {}
