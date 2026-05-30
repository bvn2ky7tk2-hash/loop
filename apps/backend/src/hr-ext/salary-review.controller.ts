import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { SalaryReviewService } from './salary-review.service';
import { SuggestFromReviewDto, ApproveReviewDto, FilterSalaryReviewDto } from './dto/salary-review.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/v1/hr/salary-reviews')
export class SalaryReviewController {
  constructor(private readonly svc: SalaryReviewService) {}

  @Get()
  @RequirePermission('employees:read')
  list(@Query() dto: FilterSalaryReviewDto) {
    return this.svc.list(dto);
  }

  @Get(':id')
  @RequirePermission('employees:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermission('employees:update')
  suggest(@Body() dto: SuggestFromReviewDto) {
    return this.svc.suggestFromReview(dto.reviewId, dto.employeeId, dto.score);
  }

  @Post(':id/approve')
  @RequirePermission('employees:update')
  approve(@Param('id') id: string, @Body() dto: ApproveReviewDto) {
    return this.svc.approveReview(id, dto.approverId);
  }

  @Post(':id/apply')
  @RequirePermission('employees:update')
  apply(@Param('id') id: string) {
    return this.svc.applyReview(id);
  }
}
