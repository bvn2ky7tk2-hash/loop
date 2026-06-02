import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PerformanceBonusService } from './performance-bonus.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import type { JwtUser } from '../common/types/jwt-user.type';
import {
  IsString, IsNotEmpty, IsNumber, Min, Max,
  IsOptional, IsBoolean, IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CalculateBonusDto {
  @IsString() @IsNotEmpty()
  employeeId: string;

  @IsNumber() @Min(0) @Max(10)
  @Type(() => Number)
  score: number;
}

export class CreateBonusConfigDto {
  @IsString() @IsNotEmpty()
  label: string;

  @IsNumber() @Min(0) @Max(10)
  @Type(() => Number)
  scoreMin: number;

  @IsNumber() @Min(0) @Max(10)
  @Type(() => Number)
  scoreMax: number;

  @IsNumber() @Min(0)
  @Type(() => Number)
  coefficient: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('api/v1/hr')
export class PerformanceBonusController {
  constructor(private readonly svc: PerformanceBonusService) {}

  /**
   * GET /api/v1/hr/performance-bonuses
   * Danh sách bonus, filter by employeeId / status.
   */
  @Get('performance-bonuses')
  @RequirePermission('performance:read')
  list(
    @Query('employeeId') employeeId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.svc.findAll(employeeId, user?.tenantId ?? undefined, page, limit);
  }

  /**
   * POST /api/v1/hr/performance-bonuses/:reviewId/calculate
   * Trigger tính bonus từ review.
   */
  @Post('performance-bonuses/:reviewId/calculate')
  @RequirePermission('performance:manage')
  calculateFromReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: CalculateBonusDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.svc.calculateFromReview(
      reviewId,
      dto.employeeId,
      dto.score,
      user?.tenantId ?? undefined,
    );
  }

  /**
   * POST /api/v1/hr/performance-bonuses/:id/approve
   * Phê duyệt bonus — chỉ ADMIN / LEADERSHIP.
   */
  @Post('performance-bonuses/:id/approve')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission('performance:manage')
  approveBonus(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.approveBonus(id, user.sub);
  }

  /**
   * GET /api/v1/hr/performance-bonus-configs
   * Danh sách cấu hình thưởng.
   */
  @Get('performance-bonus-configs')
  @RequirePermission('performance:read')
  listConfigs(@CurrentUser() user?: JwtUser) {
    // Dùng thẳng prisma qua service helper — service expose findAll, dùng seedDefaultConfigs để kiểm tra
    // Trả config từ prisma service trực tiếp qua PerformanceBonusService
    return (this.svc as any).prisma.performanceBonusConfig.findMany({
      where: {
        isActive: true,
        ...(user?.tenantId ? { tenantId: user.tenantId } : {}),
      },
      orderBy: { scoreMin: 'asc' },
      take: 50,
    });
  }

  /**
   * POST /api/v1/hr/performance-bonus-configs
   * Tạo cấu hình thưởng mới — chỉ ADMIN.
   */
  @Post('performance-bonus-configs')
  @Roles(Role.ADMIN)
  @RequirePermission('performance:manage')
  createConfig(
    @Body() dto: CreateBonusConfigDto,
    @CurrentUser() user?: JwtUser,
  ) {
    return (this.svc as any).prisma.performanceBonusConfig.create({
      data: {
        label:       dto.label,
        scoreMin:    dto.scoreMin,
        scoreMax:    dto.scoreMax,
        coefficient: dto.coefficient,
        isActive:    dto.isActive ?? true,
        ...(user?.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });
  }
}
