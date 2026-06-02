import { Controller, Get, HttpCode, Post } from '@nestjs/common';
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
  createSnapshot() {
    return this.healthService.createSnapshot();
  }

  @Post('demo/reset')
  @HttpCode(200)
  resetDemo() {
    return this.healthService.resetDemo();
  }
}
