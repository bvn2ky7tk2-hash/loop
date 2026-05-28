import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../generated/prisma';
import { ModuleConfigService } from './module-config.service';
import { ToggleModuleDto } from './dto/toggle-module.dto';

@ApiTags('module-config')
@ApiBearerAuth()
@Controller('api/v1/module-config')
export class ModuleConfigController {
  constructor(private readonly service: ModuleConfigService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách tất cả module và trạng thái (ADMIN)' })
  listModules() {
    return this.service.listModules();
  }

  @Put(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bật/tắt module (ADMIN)' })
  toggleModule(
    @Param('id') moduleId: string,
    @Body() dto: ToggleModuleDto,
  ) {
    return this.service.toggleModule(moduleId, dto.isEnabled);
  }

  @Get(':id/status')
  @Public()
  @ApiOperation({ summary: 'Kiểm tra trạng thái module (public, dùng cho frontend guard)' })
  getModuleStatus(@Param('id') moduleId: string) {
    return this.service.getModuleStatus(moduleId);
  }
}
