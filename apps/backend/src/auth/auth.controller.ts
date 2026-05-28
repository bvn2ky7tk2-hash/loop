import { Body, Controller, Get, Post, Req, Res, UseGuards, HttpCode, UnauthorizedException, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordSelfDto } from './dto/change-password-self.dto';
import type { User } from '../generated/prisma';
import { PermissionsService } from '../permissions/permissions.service';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @Throttle({ auth: { ttl: 60_000, limit: 10 } }) // 10 lần / phút / IP — chống brute force
  @ApiOperation({ summary: 'Login with email and password' })
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @Throttle({ auth: { ttl: 60_000, limit: 20 } }) // 20 lần / phút / IP
  @ApiOperation({ summary: 'Refresh access token using cookie' })
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['refresh_token'] as string | undefined;
    if (!token) throw new UnauthorizedException('No refresh token');
    return this.authService.refresh(token, res);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and clear cookies' })
  logout(@Req() req: Request & { user: User }, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.user.id, res);
  }

  @Patch('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản hiện tại' })
  changePassword(
    @Req() req: Request & { user: User },
    @Body() dto: ChangePasswordSelfDto,
  ) {
    return this.authService.changePasswordSelf(req.user.id, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile with permissions' })
  async me(@Req() req: Request & { user: User }) {
    const u = req.user;
    const [permSet, moduleRoles] = await Promise.all([
      this.permissionsService.getEffectivePermissions(u.id),
      this.permissionsService.getUserModuleRoleCodes(u.id),
    ]);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: Array.from(permSet),
      moduleRoles,
    };
  }
}
