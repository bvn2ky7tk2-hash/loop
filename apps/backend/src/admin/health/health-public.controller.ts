import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

/**
 * Probe public cho orchestrator (k8s/docker/load-balancer) — KHÔNG cần auth.
 * Tách khỏi HealthController (ADMIN) để hạ tầng probe được mà không lộ chi tiết hệ thống.
 */
@ApiTags('health')
@Controller('health')
export class HealthPublicController {
  constructor(private readonly health: HealthService) {}

  @Get('liveness')
  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 300 } })
  @ApiOperation({ summary: 'Liveness probe (public) — tiến trình còn sống' })
  liveness() {
    return this.health.getLiveness();
  }

  @Get('readiness')
  @Public()
  @Throttle({ global: { ttl: 60_000, limit: 300 } })
  @ApiOperation({ summary: 'Readiness probe (public) — sẵn sàng nhận traffic (kiểm DB)' })
  async readiness() {
    const r = await this.health.getReadiness();
    if (r.status !== 'ok') throw new ServiceUnavailableException(r);
    return r;
  }
}
