import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FilterJobDto } from './dto/filter-job.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

@ApiTags('Recruitment — Jobs')
@ApiBearerAuth()
@Controller('api/v1/recruit/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission('recruit_jobs:manage', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Tạo vị trí tuyển dụng mới' })
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Get()
  @RequirePermission('recruit_jobs:read', PERMISSIONS.RECRUIT_READ)
  @ApiOperation({ summary: 'Danh sách vị trí tuyển dụng' })
  findAll(@Query() filter: FilterJobDto) {
    return this.jobsService.findAll(filter);
  }

  @Get(':id')
  @RequirePermission('recruit_jobs:read', PERMISSIONS.RECRUIT_READ)
  @ApiOperation({ summary: 'Chi tiết vị trí tuyển dụng' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.findOne(id);
  }

  @Put(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission('recruit_jobs:manage', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Cập nhật vị trí tuyển dụng' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('recruit_jobs:manage', PERMISSIONS.RECRUIT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá vị trí tuyển dụng' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.remove(id);
  }

  @Patch(':id/close')
  @RequirePermission('recruit_jobs:manage', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Đóng vị trí tuyển dụng' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.close(id);
  }
}
