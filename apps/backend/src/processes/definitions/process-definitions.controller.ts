import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { ProcessDefinitionsService } from './process-definitions.service';
import { CreateDefinitionDto } from './dto/create-definition.dto';
import { UpdateDefinitionDto } from './dto/update-definition.dto';
import { PatchDefinitionStatusDto } from './dto/patch-status.dto';

@ApiTags('processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/processes/definitions')
export class ProcessDefinitionsController {
  constructor(private readonly service: ProcessDefinitionsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách process definitions' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    // Gọi findAll không lọc orgUnit (admin xem tất cả)
    return this.service.findAll([], page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết process definition' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PM)
  @ApiOperation({ summary: 'Tạo process definition mới' })
  create(@Body() dto: CreateDefinitionDto, @CurrentUser() user: JwtUser) {
    const orgUnitId = user.orgUnitId ?? '';
    return this.service.create(dto, orgUnitId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PM)
  @ApiOperation({ summary: 'Cập nhật process definition (ACTIVE → tạo version mới)' })
  update(@Param('id') id: string, @Body() dto: UpdateDefinitionDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.PM)
  @ApiOperation({ summary: 'Chuyển trạng thái definition: DRAFT → ACTIVE → DEPRECATED' })
  patchStatus(@Param('id') id: string, @Body() dto: PatchDefinitionStatusDto) {
    return this.service.patchStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PM)
  @ApiOperation({ summary: 'Xoá process definition (chỉ DRAFT)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
