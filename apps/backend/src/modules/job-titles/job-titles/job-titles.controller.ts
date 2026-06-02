import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { JobTitlesService } from './job-titles.service';
import { CreateJobTitleDto, UpdateJobTitleDto, JobTitleQueryDto } from './dto/job-title.dto';

@ApiTags('job-titles')
@ApiBearerAuth()
@Throttle({ default: { ttl: 60_000, limit: 100 } })
@Controller('api/v1/job-titles')
export class JobTitlesController {
  constructor(private readonly service: JobTitlesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Danh sách chức danh (có phân trang, filter)' })
  list(@Query() query: JobTitleQueryDto) {
    return this.service.list(query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_CREATE)
  @ApiOperation({ summary: 'Tạo chức danh mới' })
  create(@Body() dto: CreateJobTitleDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'Chi tiết chức danh' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Cập nhật chức danh' })
  update(@Param('id') id: string, @Body() dto: UpdateJobTitleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id/deactivate')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({ summary: 'Vô hiệu hóa chức danh (không xóa)' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
