import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { HrHolidaysService } from './hr-holidays.service';
import { BulkCreateHolidayDto, CreateHolidayDto, HolidayQueryDto } from './dto/holiday.dto';
import { Role } from '../generated/prisma';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/v1/hr-holidays')
export class HrHolidaysController {
  constructor(private readonly svc: HrHolidaysService) {}

  // GET /api/v1/hr-holidays?year=2026
  @Get()
  list(@Query() query: HolidayQueryDto) {
    return this.svc.list(query.year);
  }

  // POST /api/v1/hr-holidays/seed-vn
  // (khai báo trước /:id để tránh xung đột route)
  @Post('seed-vn')
  @Roles(Role.ADMIN)
  seedVN() {
    return this.svc.seedVN2026();
  }

  // POST /api/v1/hr-holidays/bulk
  @Post('bulk')
  @Roles(Role.ADMIN)
  bulkCreate(@Body() dto: BulkCreateHolidayDto) {
    return this.svc.bulkCreate(dto);
  }

  // POST /api/v1/hr-holidays
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateHolidayDto) {
    return this.svc.create(dto);
  }

  // DELETE /api/v1/hr-holidays/:id
  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
