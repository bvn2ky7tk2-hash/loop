import { Controller, Get, Post, Put, Body, Param, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from '../generated/prisma';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('users')
@ApiBearerAuth()
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.ADMIN_USERS)
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng (scoped by org) hoặc tìm kiếm' })
  findAll(
    @Req() req: { orgUnitIds: string[] | null },
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    if (search) {
      return this.service.searchUsers(search, limit ? parseInt(limit, 10) : 10);
    }
    return this.service.findAll(req.orgUnitIds);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.ADMIN_USERS)
  @ApiOperation({ summary: 'Cập nhật role và org unit người dùng' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/password')
  @Roles(Role.ADMIN)
  @RequirePermission(PERMISSIONS.ADMIN_USERS)
  @ApiOperation({ summary: 'Đổi mật khẩu người dùng' })
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(id, dto);
  }
}
