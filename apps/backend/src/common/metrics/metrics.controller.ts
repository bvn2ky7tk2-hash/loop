import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { MetricsService } from './metrics.service';

/**
 * Endpoint scrape cho Prometheus. Public (không auth) — chuẩn cho scraper trong mạng
 * nội bộ; metrics KHÔNG chứa dữ liệu nhạy cảm (chỉ count/latency). Ở production nên
 * giới hạn truy cập /metrics ở tầng network/ingress.
 */
@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @SkipThrottle()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics (public scrape)' })
  scrape(): string {
    return this.metrics.render();
  }
}
