import { CallHandler, ExecutionContext, Injectable, NestInterceptor, HttpException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Ghi metrics cho mọi HTTP request: số lượng + thời gian xử lý, theo route + status.
 * Đặt NGOÀI CÙNG (APP_INTERCEPTOR đầu tiên) để đo trọn vòng đời request.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const start = process.hrtime.bigint();
    const req = ctx.switchToHttp().getRequest();
    const method: string = req?.method ?? 'UNKNOWN';
    const route = `${ctx.getClass().name}.${ctx.getHandler().name}`;

    const record = (status: number) => {
      const sec = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.observeHttp(method, route, status, sec);
    };

    return next.handle().pipe(
      tap({
        next: () => record(ctx.switchToHttp().getResponse()?.statusCode ?? 200),
        error: (err) => record(err instanceof HttpException ? err.getStatus() : 500),
      }),
    );
  }
}
