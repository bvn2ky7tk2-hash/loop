import {
  Controller, Post, Body, UseInterceptors, UploadedFile,
  BadRequestException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { ImportService } from './import.service';
import type { ImportTemplate } from './dto/import.dto';

@ApiTags('import')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('api/v1/import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV'), false);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, template: { type: 'string' } } } })
  @ApiOperation({ summary: 'Preview import — parse file, trả về valid rows và errors' })
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Query('template') template: string,
  ) {
    if (!file) throw new BadRequestException('Vui lòng upload file');
    if (!['employees', 'assets', 'jobs'].includes(template)) {
      throw new BadRequestException('Template không hợp lệ. Chọn: employees | assets | jobs');
    }
    return this.service.preview(file.buffer, template as ImportTemplate);
  }

  @Post('commit')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV'), false);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, template: { type: 'string' } } } })
  @ApiOperation({ summary: 'Commit import — thực hiện import các row hợp lệ vào DB' })
  async commit(
    @UploadedFile() file: Express.Multer.File,
    @Query('template') template: string,
  ) {
    if (!file) throw new BadRequestException('Vui lòng upload file');
    if (!['employees', 'assets', 'jobs'].includes(template)) {
      throw new BadRequestException('Template không hợp lệ. Chọn: employees | assets | jobs');
    }
    return this.service.commit(file.buffer, template as ImportTemplate);
  }
}
