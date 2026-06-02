import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { ScreensService } from './screens.service';

@ApiTags('screens')
@ApiBearerAuth()
@Controller('api/v1/admin/screens')
export class ScreensController {
  constructor(private readonly service: ScreensService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ADMIN_PERMISSIONS)
  @ApiOperation({ summary: 'Lấy danh sách screens từ registry' })
  findAll() {
    return this.service.findAll();
  }
}
