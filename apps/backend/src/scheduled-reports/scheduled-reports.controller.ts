import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { ScheduledReportsService } from './scheduled-reports.service';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('scheduled-reports')
@ApiBearerAuth()
@Controller('api/v1/scheduled-reports')
@Roles(Role.ADMIN)
export class ScheduledReportsController {
  constructor(private readonly svc: ScheduledReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách scheduled reports' })
  list(@Query() query: PaginationDto) {
    return this.svc.listReports(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo scheduled report mới' })
  create(@Body() dto: CreateScheduledReportDto) {
    return this.svc.createReport(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật scheduled report' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduledReportDto) {
    return this.svc.updateReport(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá scheduled report' })
  remove(@Param('id') id: string) {
    return this.svc.deleteReport(id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi report ngay lập tức (test)' })
  sendNow(@Param('id') id: string) {
    return this.svc.sendNow(id);
  }
}
