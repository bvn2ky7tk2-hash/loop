import { Module } from '@nestjs/common';
import { VehicleBookingService } from './vehicle-booking.service';
import { VehicleBookingController } from './vehicle-booking.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleBookingController],
  providers: [VehicleBookingService],
  exports: [VehicleBookingService],
})
export class VehicleBookingModule {}
