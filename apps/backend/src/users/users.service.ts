import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InviteUsersDto } from './dto/invite-users.dto';
import { OrgScopeService } from '../common/services/org-scope.service';
import { QuotaService } from '../common/services/quota.service';
import { MailService } from '../notifications/mail.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgScope: OrgScopeService,
    private readonly quota: QuotaService,
    private readonly mail: MailService,
  ) {}

  // Mời nhiều người dùng: tạo tài khoản + mật khẩu tạm + gửi email đăng nhập.
  // Lỗi/đã tồn tại của 1 email KHÔNG làm hỏng cả mẻ.
  async inviteMany(dto: InviteUsersDto) {
    let orgUnitId = dto.orgUnitId;
    if (!orgUnitId) {
      const root = await this.prisma.orgUnit.findFirst({
        orderBy: [{ parentId: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      if (!root) throw new BadRequestException('Chưa có đơn vị tổ chức nào — tạo phòng ban trước khi mời');
      orgUnitId = root.id;
    }

    const emails = [...new Set(dto.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const invited: string[] = [];
    const skipped: string[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const email of emails) {
      try {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) { skipped.push(email); continue; }

        await this.quota.assertCanAddUser();

        // Mật khẩu tạm: đủ chữ + số, ≥ 8 ký tự (đạt IsStrongPassword)
        const tempPassword = `Lp${randomBytes(4).toString('hex')}9`;
        const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
        const name = email.split('@')[0];

        await this.prisma.user.create({
          data: { email, name, passwordHash, role: dto.role, orgUnitId },
        });
        invited.push(email);

        // Gửi mail là best-effort — lỗi SMTP không hủy việc tạo tài khoản
        try {
          await this.mail.sendNotificationEmail(
            email,
            name,
            'Lời mời tham gia Loop.vn',
            `Bạn được mời tham gia hệ thống Loop.vn.\n\nĐăng nhập:\n- Email: ${email}\n- Mật khẩu tạm: ${tempPassword}\n\nVui lòng đăng nhập và đổi mật khẩu ngay sau lần đầu.`,
          );
        } catch { /* đã tạo user; bỏ qua lỗi gửi mail */ }
      } catch (e: any) {
        failed.push({ email, reason: e?.message ?? 'Lỗi không xác định' });
      }
    }

    return { invited: invited.length, invitedEmails: invited, skipped, failed };
  }

  async create(dto: CreateUserDto) {
    await this.quota.assertCanAddUser();

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
        orgUnitId: dto.orgUnitId,
      },
      include: { orgUnit: { select: { name: true } } },
    });

    if (dto.employeeId) {
      await this.prisma.employee.update({
        where: { id: dto.employeeId },
        data: { userId: user.id },
      });
    }

    return this.toPublic(user);
  }

  async findAll(orgUnitIds: string[] | null) {
    const where = orgUnitIds === null
      ? {}
      : { orgUnitId: { in: orgUnitIds } };

    const users = await this.prisma.user.findMany({
      where,
      include: {
        orgUnit: { select: { name: true } },
        employee: {
          select: {
            code: true, fullName: true,
            orgUnit: { select: { name: true } },
            jobTitle: { select: { name: true } },
            position: { select: { code: true, jobTitle: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(this.toPublic);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOneOrThrow(id);
    // Đổi role hoặc vô hiệu hóa (isActive=false) phải thu hồi mọi access token cũ:
    // bump tokenVersion → JwtStrategy từ chối token cũ ở request kế tiếp.
    const revoke = dto.role !== undefined || dto.isActive !== undefined;
    const user = await this.prisma.user.update({
      where: { id },
      data: revoke ? { ...dto, tokenVersion: { increment: 1 } } : dto,
      include: { orgUnit: { select: { name: true } } },
    });
    if (dto.orgUnitId !== undefined) {
      await this.orgScope.invalidateUser(id);
    }
    return this.toPublic(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.findOneOrThrow(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      // refreshToken=null thu hồi refresh token; tokenVersion++ thu hồi cả access token cũ.
      data: { passwordHash, refreshToken: null, tokenVersion: { increment: 1 } },
    });
    return { message: 'Mật khẩu đã được cập nhật' };
  }

  async searchUsers(query: string, limit = 10) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: Math.min(limit, 50),
    });
    return users;
  }

  private async findOneOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  private toPublic(user: User & { orgUnit?: { name: string } | null; employee?: unknown }) {
    const { passwordHash: _ph, refreshToken: _rt, ...rest } = user;
    return {
      ...rest,
      orgUnitName: user.orgUnit?.name ?? null,
      employee: (user as { employee?: unknown }).employee ?? null,
    };
  }
}
