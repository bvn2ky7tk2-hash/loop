import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { JwtUser } from '../types/jwt-user.type';
import { OrgScopeService } from '../services/org-scope.service';

@Injectable()
export class OrgScopeInterceptor implements NestInterceptor {
  constructor(private readonly orgScope: OrgScopeService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<Request & { user: JwtUser; orgUnitIds: string[] | null }>();
    const user = req.user;

    if (user) {
      // null = ADMIN (no filter), [] = no orgUnit, [...ids] = scoped
      req.orgUnitIds = await this.orgScope.getVisibleOrgUnitIds(user);
    }

    return next.handle();
  }
}
