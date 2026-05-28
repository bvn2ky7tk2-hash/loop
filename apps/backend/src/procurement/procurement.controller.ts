import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Request,
} from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { CreatePoDto, UpdatePoStatusDto, ReceiveItemDto } from './dto/purchase-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('api/v1/procurement')
export class ProcurementController {
  constructor(private readonly svc: ProcurementService) {}

  @Get('stats')
  stats() { return this.svc.getStats(); }

  // ─── Vendors ───────────────────────────────────────────────────────────────

  @Get('vendors')
  listVendors(@Query() q: PaginationDto & { status?: string; category?: string; search?: string }) {
    return this.svc.listVendors(q);
  }

  @Get('vendors/:id')
  getVendor(@Param('id') id: string) { return this.svc.getVendor(id); }

  @Post('vendors')
  createVendor(@Body() dto: CreateVendorDto) { return this.svc.createVendor(dto); }

  @Put('vendors/:id')
  updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.svc.updateVendor(id, dto);
  }

  @Delete('vendors/:id')
  deleteVendor(@Param('id') id: string) { return this.svc.deleteVendor(id); }

  // ─── Purchase Orders ────────────────────────────────────────────────────────

  @Get('purchase-orders')
  listPos(@Query() q: PaginationDto & { status?: string; vendorId?: string; search?: string }) {
    return this.svc.listPos(q);
  }

  @Get('purchase-orders/:id')
  getPo(@Param('id') id: string) { return this.svc.getPo(id); }

  @Post('purchase-orders')
  createPo(@Body() dto: CreatePoDto, @Request() req: any) {
    return this.svc.createPo(dto, req.user.sub);
  }

  @Put('purchase-orders/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePoStatusDto, @Request() req: any) {
    return this.svc.updatePoStatus(id, dto, req.user.sub);
  }

  @Post('purchase-orders/:id/receive')
  receiveItems(@Param('id') poId: string, @Body() body: { items: ReceiveItemDto[] }) {
    return this.svc.receiveItems(poId, body.items);
  }

  @Delete('purchase-orders/:id')
  deletePo(@Param('id') id: string) { return this.svc.deletePo(id); }
}
