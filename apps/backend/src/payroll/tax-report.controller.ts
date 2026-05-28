import {
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { TaxReportService } from './tax-report.service';
import type { Response } from 'express';
import dayjs from 'dayjs';

@ApiTags('payroll-reports')
@ApiBearerAuth()
@Controller('api/v1/payroll/reports')
export class TaxReportController {
  constructor(private readonly service: TaxReportService) {}

  @Get('pit-annual')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Xuất báo cáo 05-QTT-TNCN theo năm (Excel)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async exportPitAnnual(
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const y = year ? parseInt(year, 10) : dayjs().year();
    const buffer = await this.service.generate05QTT(y);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="05-QTT-TNCN-${y}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('labor-cost/:periodId')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Xuất báo cáo chi phí lao động theo kỳ (Excel)' })
  async exportLaborCost(
    @Param('periodId') periodId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateLaborCostReport(periodId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="labor-cost-${periodId}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
