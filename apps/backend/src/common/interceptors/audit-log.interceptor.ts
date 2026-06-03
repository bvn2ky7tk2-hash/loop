import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUEST } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { SetMetadata } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const AUDIT_ACTION_KEY = 'audit_action';
export const Audited = (action: string, resource?: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, resource });

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<{ action: string; resource?: string } | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      tap(async () => {
        if (!auditMeta) return;
        const user = this.request?.user;
        if (!user?.id) return;

        const resourceId = this.request?.params?.id ?? null;
        try {
          await this.prisma.auditLog.create({
            data: {
              userId:    user.id,
              // Set tenantId tường minh (không chỉ dựa CLS extension) → audit luôn
              // truy nguyên được tenant, kể cả nếu chạy ngoài CLS context.
              tenantId:  user.tenantId ?? undefined,
              action:    auditMeta.action,
              entity:    auditMeta.resource ?? context.getClass().name,
              entityId:  resourceId,
              ipAddress: this.request.ip ?? null,
            },
          });
        } catch {
          // Audit failure không chặn main flow
        }
      }),
    );
  }
}
