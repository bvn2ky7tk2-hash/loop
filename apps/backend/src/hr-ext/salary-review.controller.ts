import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { SalaryReviewService } from './salary-review.service';
import { SuggestFromReviewDto, ApproveReviewDto, FilterSalaryReviewDto } from './dto/salary-review.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/hr')
export class SalaryReviewController {
  constructor(private readonly svc: SalaryReviewService) {}

  // ── Salary Bands ─────────────────────────────────────────────────────────────
  @Get('salary-bands')
  @RequirePermission('employees:read')
  listBands(@Query() query: { page?: number; limit?: number }) {
    return this.svc.listBands(query);
  }

  // ── Salary Reviews ────────────────────────────────────────────────────────────
  @Get('salary-reviews')
  @RequirePermission('employees:read')
  list(@Query() dto: FilterSalaryReviewDto) {
    return this.svc.list(dto);
  }

  @Get('salary-reviews/:id')
  @RequirePermission('employees:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post('salary-reviews')
  @RequirePermission('employees:update')
  suggest(@Body() dto: SuggestFromReviewDto) {
    return this.svc.suggestFromReview(dto.reviewId, dto.employeeId, dto.score);
  }

  @Post('salary-reviews/:id/approve')
  @RequirePermission('employees:update')
  approve(@Param('id') id: string, @Body() dto: ApproveReviewDto) {
    return this.svc.approveReview(id, dto.approverId);
  }

  @Post('salary-reviews/:id/apply')
  @RequirePermission('employees:update')
  apply(@Param('id') id: string) {
    return this.svc.applyReview(id);
  }

}
