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
import { VehicleBookingService } from './vehicle-booking.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/create-vehicle.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';

@Controller('api/v1/vehicle-booking')
export class VehicleBookingController {
  constructor(private readonly svc: VehicleBookingService) {}

  // ─── Vehicles ────────────────────────────────────────────────────────────────

  @Get('vehicles')
  listVehicles() {
    return this.svc.listVehicles();
  }

  @Post('vehicles')
  @Roles(Role.ADMIN)
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.svc.createVehicle(dto);
  }

  @Patch('vehicles/:id')
  @Roles(Role.ADMIN)
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.svc.updateVehicle(id, dto);
  }

  @Delete('vehicles/:id')
  @Roles(Role.ADMIN)
  deleteVehicle(@Param('id') id: string) {
    return this.svc.deleteVehicle(id);
  }

  // ─── Requests ────────────────────────────────────────────────────────────────

  @Get('requests')
  listRequests(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isAdmin = req.user.role === Role.ADMIN || req.user.role === 'LEADERSHIP';
    return this.svc.listRequests(
      req.user.id, isAdmin,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('requests')
  createRequest(@Body() dto: CreateRequestDto, @Request() req: any) {
    return this.svc.createRequest(dto, req.user.id);
  }

  @Post('requests/:id/approve')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  approveRequest(@Param('id') id: string, @Request() req: any) {
    return this.svc.approveRequest(id, req.user.id);
  }

  @Post('requests/:id/reject')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  rejectRequest(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RejectRequestDto,
  ) {
    return this.svc.rejectRequest(id, req.user.id, dto.reason);
  }

  @Post('requests/:id/cancel')
  cancelRequest(@Param('id') id: string, @Request() req: any) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.svc.cancelRequest(id, req.user.id, isAdmin);
  }

  @Post('requests/:id/complete')
  completeRequest(@Param('id') id: string, @Request() req: any) {
    return this.svc.completeRequest(id, req.user.id);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }
}
