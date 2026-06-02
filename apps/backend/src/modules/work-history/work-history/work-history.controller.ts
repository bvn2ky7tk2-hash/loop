import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WorkHistoryService } from './work-history.service';
import { CreateWorkHistoryDto } from './dto/work-history.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { WorkHistoryEventType, Role } from '../generated/prisma';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class WorkHistoryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number = 50;

  @IsOptional() @IsEnum(WorkHistoryEventType)
  eventType?: WorkHistoryEventType;
}

@Controller('work-history')
export class WorkHistoryController {
  constructor(private readonly service: WorkHistoryService) {}

  @Get('employee/:employeeId')
  @RequirePermission('hr_decisions:read')
  findByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: WorkHistoryQueryDto,
  ) {
    return this.service.findByEmployee(
      employeeId,
      query.page,
      query.limit,
      query.eventType,
    );
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateWorkHistoryDto) {
    return this.service.create(dto);
  }
}
