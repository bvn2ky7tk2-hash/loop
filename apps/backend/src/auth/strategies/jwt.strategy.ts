import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { Role } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  orgUnitId?: string | null;
  tenantId?: string | null;
  isPlatformAdmin?: boolean;
  tokenVersion?: number;
}

function cookieExtractor(req: Request): string | null {
  return req?.cookies?.['access_token'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // STATEFUL: kiểm DB mỗi request để THU HỒI TỨC THÌ khi user bị vô hiệu hóa /
  // đổi quyền / tăng tokenVersion (không phải đợi access token hết hạn 15p).
  // Query PK nhẹ; lấy role/tenant/isPlatformAdmin TƯƠI từ DB (đổi quyền hiệu lực ngay).
  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        isActive: true,
        tokenVersion: true,
        role: true,
        orgUnitId: true,
        tenantId: true,
        isPlatformAdmin: true,
        email: true,
        name: true,
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không hợp lệ');
    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Phiên đã bị thu hồi, vui lòng đăng nhập lại');
    }
    return {
      id: payload.sub,
      sub: payload.sub,
      email: user.email,
      name: user.name ?? '',
      role: user.role,
      orgUnitId: user.orgUnitId ?? null,
      tenantId: user.tenantId ?? null,
      isPlatformAdmin: user.isPlatformAdmin,
      isActive: user.isActive,
    };
  }
}
