import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard-v3')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardV3Controller {
  constructor(private readonly service: DashboardService) {}

  // ─── Work Dashboard ────────────────────────────────────────────────────────
  @Get('work')
  @ApiOperation({ summary: 'Dashboard Công việc (Work module)' })
  getWork(@Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getWork(userId, tenantId);
  }

  // ─── People Dashboard ──────────────────────────────────────────────────────
  @Get('people')
  @ApiOperation({ summary: 'Dashboard Nhân sự (People module)' })
  getPeople(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getPeople(tenantId);
  }

  // ─── Finance Dashboard ─────────────────────────────────────────────────────
  @Get('finance')
  @ApiOperation({ summary: 'Dashboard Tài chính (Finance module)' })
  getFinance(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getFinance(tenantId);
  }

  // ─── CRM Dashboard ─────────────────────────────────────────────────────────
  @Get('crm')
  @ApiOperation({ summary: 'Dashboard CRM' })
  getCrm(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getCrm(tenantId);
  }

  // ─── Asset Dashboard ───────────────────────────────────────────────────────
  @Get('asset')
  @ApiOperation({ summary: 'Dashboard Tài sản (Asset module)' })
  getAsset(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getAsset(tenantId);
  }

  // ─── Ops Dashboard ─────────────────────────────────────────────────────────
  @Get('ops')
  @ApiOperation({ summary: 'Dashboard Vận hành (Ops module)' })
  getOps(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getOps(tenantId);
  }

  // ─── Me Dashboard ──────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Dashboard Cá nhân (Me module)' })
  getMe(@Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getMe(userId, tenantId);
  }

  // ─── Admin Dashboard ───────────────────────────────────────────────────────
  @Get('admin')
  @ApiOperation({ summary: 'Dashboard Quản trị (Admin module)' })
  getAdmin(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getAdmin(tenantId);
  }

  // ── L-09: Dashboard Summary APIs ─────────────────────────────────────────

  @Get('finance-summary')
  @ApiOperation({ summary: 'Doanh thu vs chi phí 6 tháng gần nhất' })
  getFinanceSummary(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getFinanceSummary(tenantId);
  }

  @Get('my-tasks-summary')
  @ApiOperation({ summary: 'Tổng tasks theo trạng thái của user hiện tại' })
  getMyTasksSummary(@Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getMyTasksSummary(userId, tenantId);
  }

  @Get('work-trend')
  @ApiOperation({ summary: 'Tasks hoàn thành 7 ngày gần nhất' })
  getWorkTrend(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getWorkTrend(tenantId);
  }

  @Get('people-by-dept')
  @ApiOperation({ summary: 'Headcount theo phòng ban' })
  getPeopleByDept(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getPeopleByDept(tenantId);
  }

  @Get('today-events')
  @ApiOperation({ summary: 'Sinh nhật / Thâm niên / Nhân viên mới hôm nay' })
  getTodayEvents(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getTodayEvents(tenantId);
  }
}
