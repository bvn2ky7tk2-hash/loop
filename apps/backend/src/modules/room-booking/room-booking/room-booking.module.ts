import { Module } from '@nestjs/common';
import { RoomBookingService } from './room-booking.service';
import { RoomBookingController } from './room-booking.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoomBookingController],
  providers: [RoomBookingService],
  exports: [RoomBookingService],
})
export class RoomBookingModule {}
