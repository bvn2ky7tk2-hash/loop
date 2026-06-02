import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { RoomBookingService } from './room-booking.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/create-room.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { GanttQueryDto, AvailableRoomsQueryDto } from './dto/gantt-query.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';

@Controller('api/v1')
export class RoomBookingController {
  constructor(private readonly svc: RoomBookingService) {}

  // ─── Rooms ──────────────────────────────────────────────────────────────────

  @Get('rooms/available')
  getAvailableRooms(@Query() q: AvailableRoomsQueryDto) {
    return this.svc.getAvailableRooms(q.startTime, q.endTime);
  }

  @Get('rooms/gantt')
  getGanttData(@Query() q: GanttQueryDto) {
    const date = q.date ?? new Date().toISOString().slice(0, 10);
    return this.svc.getGanttData(date);
  }

  @Get('rooms/stats')
  getRoomStats() {
    return this.svc.getRoomStats();
  }

  @Get('rooms')
  listRooms(@Query() pagination: PaginationDto) {
    return this.svc.listRooms(pagination);
  }

  @Post('rooms')
  @Roles(Role.ADMIN)
  createRoom(@Body() dto: CreateRoomDto) {
    return this.svc.createRoom(dto);
  }

  @Patch('rooms/:id')
  @Roles(Role.ADMIN)
  updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.svc.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  @Roles(Role.ADMIN)
  deleteRoom(@Param('id') id: string) {
    return this.svc.deleteRoom(id);
  }

  // ─── Bookings ────────────────────────────────────────────────────────────────

  @Get('room-bookings')
  listBookings(@Query() query: PaginationDto & { date?: string }) {
    return this.svc.listBookings(query);
  }

  @Post('room-bookings')
  createBooking(@Body() dto: CreateBookingDto, @Request() req: any) {
    return this.svc.createBooking(dto, req.user.id);
  }

  @Delete('room-bookings/:id')
  cancelBooking(@Param('id') id: string, @Request() req: any) {
    return this.svc.cancelBooking(id, req.user.id, req.user.role);
  }
}
