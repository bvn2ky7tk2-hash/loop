import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma';
import { HealthService } from './health.service';

@Controller('admin')
@Roles(Role.ADMIN)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('demo/status')
  getDemoStatus() {
    return this.healthService.getDemoStatus();
  }

  @Post('demo/snapshot')
  @HttpCode(200)
  createSnapshot(@Body() body: { label?: string }) {
    return this.healthService.createSnapshot(body?.label);
  }

  @Post('demo/reset')
  @HttpCode(200)
  resetDemo(@Body() body: { snapshotId: string }) {
    return this.healthService.resetDemo(body.snapshotId);
  }

  @Delete('demo/snapshot/:id')
  deleteSnapshot(@Param('id') id: string) {
    return this.healthService.deleteSnapshot(id);
  }
}
