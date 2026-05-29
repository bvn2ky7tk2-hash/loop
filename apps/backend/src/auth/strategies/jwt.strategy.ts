import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { Role } from '../../generated/prisma';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  orgUnitId?: string | null;
  tenantId?: string | null;
}

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.['access_token'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
      role: payload.role,
      orgUnitId: payload.orgUnitId ?? null,
      tenantId: payload.tenantId ?? null,
      isActive: true,
    };
  }
}
