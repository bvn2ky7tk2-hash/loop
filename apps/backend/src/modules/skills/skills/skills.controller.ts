import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, SkillCategory } from '../generated/prisma';
import { SkillsService } from './skills.service';
import { CreateSkillDto, UpdateSkillDto, UpsertEmployeeSkillDto } from './dto/skill.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('skills')
@ApiBearerAuth()
@Controller('api/v1/skills')
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  // ── Master: danh sách skill ────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Danh sách kỹ năng' })
  @ApiQuery({ name: 'category', required: false, enum: SkillCategory })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  listSkills(
    @Query('category') category?: SkillCategory,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.listSkills(category, includeInactive === 'true');
  }

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Tạo kỹ năng mới' })
  createSkill(@Body() dto: CreateSkillDto) {
    return this.service.createSkill(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Cập nhật kỹ năng' })
  updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.service.updateSkill(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa kỹ năng' })
  deleteSkill(@Param('id') id: string) {
    return this.service.deleteSkill(id);
  }

  // ── Ma trận kỹ năng ────────────────────────────────────────────────────────
  @Get('matrix')
  @ApiOperation({ summary: 'Ma trận kỹ năng toàn tổ chức' })
  getSkillMatrix(
    @Query('orgUnitId') orgUnitId?: string,
    @Query('skillIds') skillIds?: string,
    @Query() pagination?: PaginationDto,
  ) {
    const ids = skillIds ? skillIds.split(',').filter(Boolean) : undefined;
    return this.service.getSkillMatrix(orgUnitId, ids, pagination?.page, pagination?.limit);
  }

  @Get('resource-availability')
  @ApiOperation({ summary: 'Nguồn lực khả dụng theo kỹ năng' })
  @ApiQuery({ name: 'skillId', required: false })
  @ApiQuery({ name: 'skillLevel', required: false })
  @ApiQuery({ name: 'date', required: false })
  getResourceAvailability(
    @Query('skillId') skillId?: string,
    @Query('skillLevel') skillLevel?: string,
    @Query('date') date?: string,
  ) {
    return this.service.getResourceAvailability(skillId, skillLevel, date);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê skill gap theo kỹ năng' })
  getSkillStats() {
    return this.service.getSkillStats();
  }

  // ── Kỹ năng theo nhân viên ─────────────────────────────────────────────────
  @Get('employees/:employeeId')
  @ApiOperation({ summary: 'Danh sách kỹ năng của nhân viên' })
  getEmployeeSkills(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeSkills(employeeId);
  }

  @Patch('employees/:employeeId/:skillId')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Thêm hoặc cập nhật kỹ năng cho nhân viên' })
  upsertEmployeeSkill(
    @Param('employeeId') employeeId: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpsertEmployeeSkillDto,
  ) {
    return this.service.upsertEmployeeSkill(employeeId, skillId, dto);
  }

  @Delete('employees/:employeeId/:skillId')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Xóa kỹ năng khỏi nhân viên' })
  removeEmployeeSkill(
    @Param('employeeId') employeeId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.service.removeEmployeeSkill(employeeId, skillId);
  }
}
