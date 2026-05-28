import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('api/v1/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Danh sách audit logs (Admin only)' })
  list(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.listLogs({
      userId:   query.userId,
      module:   query.module,
      action:   query.action,
      entity:   query.entity,
      dateFrom: query.dateFrom,
      dateTo:   query.dateTo,
      page:     query.page,
      limit:    query.limit,
    });
  }

  @Get('export')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Export audit logs sang Excel (Admin only)' })
  async export(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const rows = await this.auditLogService.getLogsForExport({
      userId:   query.userId,
      module:   query.module,
      action:   query.action,
      entity:   query.entity,
      dateFrom: query.dateFrom,
      dateTo:   query.dateTo,
    });

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Log');

    worksheet.columns = [
      { header: 'Timestamp',  key: 'timestamp',  width: 22 },
      { header: 'User',       key: 'user',        width: 25 },
      { header: 'Action',     key: 'action',      width: 12 },
      { header: 'Module',     key: 'module',      width: 14 },
      { header: 'Entity',     key: 'entity',      width: 18 },
      { header: 'Entity ID',  key: 'entityId',    width: 38 },
      { header: 'Chi tiết',   key: 'details',     width: 60 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFF1F5F9' } };

    for (const row of rows) {
      worksheet.addRow({
        timestamp: new Date(row.createdAt).toLocaleString('vi-VN'),
        user:      row.user?.name ?? row.userId ?? '—',
        action:    row.action,
        module:    row.module ?? '—',
        entity:    row.entity,
        entityId:  row.entityId ?? '—',
        details:   row.newValues
          ? JSON.stringify(row.newValues).slice(0, 200)
          : row.oldValues
            ? JSON.stringify(row.oldValues).slice(0, 200)
            : '—',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.xlsx"`);
    res.send(buffer);
  }
}
