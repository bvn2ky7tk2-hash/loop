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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { FilterAssetDto } from './dto/filter-asset.dto';
import { AssignAssetDto, ReturnAssetDto } from './dto/assign-asset.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@Controller('api/v1/assets')
export class AssetsController {
  constructor(private readonly svc: AssetsService) {}

  @Get('summary')
  @RequirePermission(PERMISSIONS.ASSET_READ)
  getSummary() {
    return this.svc.getSummary();
  }

  @Get('assignments')
  @RequirePermission(PERMISSIONS.ASSET_READ)
  findAllAssignments(@Query() q: any) {
    return this.svc.findAllAssignments(q);
  }

  @Get('maintenance')
  @RequirePermission(PERMISSIONS.ASSET_READ)
  findAllMaintenance(@Query() q: any) {
    return this.svc.findAllMaintenance(q);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ASSET_READ)
  findAll(@Query() filter: FilterAssetDto) {
    return this.svc.findAll(filter);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.ASSET_MANAGE)
  create(@Body() dto: CreateAssetDto) {
    return this.svc.create(dto);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ASSET_READ)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Put(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.ASSET_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ASSET_MANAGE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/assign')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.ASSET_MANAGE)
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {
    return this.svc.assign(id, dto);
  }

  @Patch(':id/return')
  @RequirePermission(PERMISSIONS.ASSET_MANAGE)
  returnAsset(@Param('id') id: string, @Body() dto: ReturnAssetDto) {
    return this.svc.return(id, dto);
  }

  @Get(':id/assignments')
  @RequirePermission(PERMISSIONS.ASSET_READ)
  getAssignmentHistory(@Param('id') id: string) {
    return this.svc.getAssignmentHistory(id);
  }

  @Post(':id/maintenance')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.ASSET_MANAGE)
  addMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceDto) {
    return this.svc.addMaintenance(id, dto);
  }

  @Get(':id/depreciation')
  @RequirePermission(PERMISSIONS.ASSET_READ)
  getDepreciation(@Param('id') id: string) {
    return this.svc.getDepreciation(id);
  }
}
