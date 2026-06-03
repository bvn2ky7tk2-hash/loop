import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordSelfDto } from './dto/change-password-self.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const ACCESS_TOKEN_TTL = 15 * 60;       // 15 min (seconds)
const REFRESH_TOKEN_TTL = 7 * 24 * 3600; // 7 days (seconds)

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgUnitId: user.orgUnitId,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
      secret: this.config.getOrThrow('JWT_SECRET'),
    });

    const refreshToken = this.jwt.sign(
      { sub: user.id },
      {
        expiresIn: REFRESH_TOKEN_TTL,
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      },
    );

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshHash },
    });

    this.setCookies(res, accessToken, refreshToken);

    return {
      access_token: accessToken,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgUnitId: user.orgUnitId,
      },
    };
  }

  async refresh(refreshToken: string, res: Response) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.refreshToken) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException();

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgUnitId: user.orgUnitId,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin,
      tokenVersion: user.tokenVersion,
    };

    const newAccessToken = this.jwt.sign(jwtPayload, {
      expiresIn: ACCESS_TOKEN_TTL,
      secret: this.config.getOrThrow('JWT_SECRET'),
    });

    const newRefreshToken = this.jwt.sign(
      { sub: user.id },
      {
        expiresIn: REFRESH_TOKEN_TTL,
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      },
    );

    const newRefreshHash = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshHash },
    });

    this.setCookies(res, newAccessToken, newRefreshToken);
    return { access_token: newAccessToken, message: 'Token refreshed' };
  }

  async logout(userId: string, res: Response) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    this.clearCookies(res);
    return { message: 'Logged out' };
  }

  async changePasswordSelf(userId: string, dto: ChangePasswordSelfDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Mật khẩu cũ không đúng');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      // refreshToken=null thu hồi refresh token; tokenVersion++ thu hồi cả access token cũ.
      data: { passwordHash, refreshToken: null, tokenVersion: { increment: 1 } },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env['NODE_ENV'] === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: ACCESS_TOKEN_TTL * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: REFRESH_TOKEN_TTL * 1000,
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
