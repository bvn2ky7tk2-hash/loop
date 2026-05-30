import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OrgScopeService } from '../common/services/org-scope.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgScope: OrgScopeService,
  ) {}

  async create(dto: CreateUserDto) {
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
      include: { orgUnit: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    return users.map(this.toPublic);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOneOrThrow(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
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
      data: { passwordHash, refreshToken: null },
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

  private toPublic(user: User & { orgUnit?: { name: string } | null }) {
    const { passwordHash: _ph, refreshToken: _rt, ...rest } = user;
    return {
      ...rest,
      orgUnitName: user.orgUnit?.name ?? null,
    };
  }
}
