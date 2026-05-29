import { Controller, Get, Post, Put, Delete, Body, Param, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, ProjectStatus } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';
import type { User } from '../generated/prisma';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddMemberDto } from './dto/add-member.dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('api/v1/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.PROJECTS_CREATE)
  @Audited('CREATE', 'Project')
  @ApiOperation({ summary: 'Tạo dự án mới' })
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiOperation({ summary: 'Danh sách dự án (org scoped)' })
  findAll(@Req() req: { orgUnitIds: string[] | null }) {
    return this.service.findAll(req.orgUnitIds);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiOperation({ summary: 'Chi tiết dự án' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'Cập nhật thông tin dự án' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.service.update(id, dto);
  }

  @Put(':id/status')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'Cập nhật trạng thái dự án' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProjectStatus,
    @CurrentUser() user: User,
  ) {
    return this.service.updateStatus(id, status, user.id);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'Thêm thành viên vào dự án' })
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.service.addMember(id, dto);
  }

  @Get(':id/members')
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiOperation({ summary: 'Danh sách thành viên dự án' })
  getMembers(@Param('id') id: string) {
    return this.service.getMembers(id);
  }

  @Put(':id/members/:memberId')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'Cập nhật thành viên dự án' })
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.service.updateMember(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.PROJECTS_UPDATE)
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá thành viên khỏi dự án' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.service.removeMember(id, memberId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.PROJECTS_DELETE)
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá dự án' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
