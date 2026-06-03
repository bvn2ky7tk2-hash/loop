import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/services/redis.service';
import { DashboardHrProvider } from './providers/dashboard-hr.provider';
import { DashboardFinanceProvider } from './providers/dashboard-finance.provider';
import { DashboardCrmProvider } from './providers/dashboard-crm.provider';
import { DashboardAssetProvider } from './providers/dashboard-asset.provider';
import { DashboardRecruitProvider } from './providers/dashboard-recruit.provider';
import { DashboardWorkProvider } from './providers/dashboard-work.provider';
import { DashboardOpsProvider } from './providers/dashboard-ops.provider';

const CACHE_TTL = 300; // 5 phút

/**
 * Facade dashboard: giữ API public getX + cache (Redis), DELEGATE phần tính toán
 * sang các provider theo domain (HR/Finance/CRM/Asset/Recruit/Work/Ops).
 * Không còn join thẳng Prisma xuyên domain ở đây.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly redis: RedisService,
    private readonly hr: DashboardHrProvider,
    private readonly finance: DashboardFinanceProvider,
    private readonly crm: DashboardCrmProvider,
    private readonly asset: DashboardAssetProvider,
    private readonly recruit: DashboardRecruitProvider,
    private readonly work: DashboardWorkProvider,
    private readonly ops: DashboardOpsProvider,
  ) {}

  // ─── Helper cache wrapper ───────────────────────────────────────────────────

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit) as T;
    const data = await fn();
    await this.redis.setex(key, CACHE_TTL, JSON.stringify(data)).catch(() => {});
    return data;
  }

  // ─── getSummary (DashboardController cũ) ───────────────────────────────────

  async getSummary(tenantId?: string) {
    const key = `dashboard:summary:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.work.calcSummary());
  }

  // ─── Work Dashboard ─────────────────────────────────────────────────────────

  async getWork(userId: string, tenantId?: string) {
    const key = `dashboard:work:${tenantId ?? 'default'}:${userId}`;
    return this.cached(key, () => this.work.calcWork(userId));
  }

  // ─── People Dashboard ────────────────────────────────────────────────────────

  async getPeople(tenantId?: string) {
    const key = `dashboard:people:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.hr.calcPeople());
  }

  // ─── Finance Dashboard ───────────────────────────────────────────────────────

  async getFinance(tenantId?: string) {
    const key = `dashboard:finance:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.finance.calcFinance());
  }

  // ─── CRM Dashboard ───────────────────────────────────────────────────────────

  async getCrm(tenantId?: string) {
    const key = `dashboard:crm:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.crm.calcCrm());
  }

  // ─── Asset Dashboard ─────────────────────────────────────────────────────────

  async getAsset(tenantId?: string) {
    const key = `dashboard:asset:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.asset.calcAsset());
  }

  // ─── Ops Dashboard ───────────────────────────────────────────────────────────

  async getOps(tenantId?: string) {
    const key = `dashboard:ops:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.ops.calcOps());
  }

  // ─── Me Dashboard (user-specific, TTL ngắn hơn) ──────────────────────────────

  async getMe(userId: string, tenantId?: string) {
    const key = `dashboard:me:${tenantId ?? 'default'}:${userId}`;
    // TTL 60s cho data cá nhân để cập nhật nhanh hơn
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit);
    const data = await this.work.calcMe(userId);
    await this.redis.setex(key, 60, JSON.stringify(data)).catch(() => {});
    return data;
  }

  // ─── Admin Dashboard ─────────────────────────────────────────────────────────

  async getAdmin(tenantId?: string) {
    const key = `dashboard:admin:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.ops.calcAdmin());
  }

  // ─── L-09 Summary APIs ───────────────────────────────────────────────────────

  async getFinanceSummary(tenantId?: string) {
    const key = `dashboard:finance-summary:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.finance.calcFinanceSummary());
  }

  async getMyTasksSummary(userId: string, tenantId?: string) {
    const key = `dashboard:my-tasks:${tenantId ?? 'default'}:${userId}`;
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit);
    const data = await this.work.calcMyTasksSummary(userId);
    await this.redis.setex(key, 60, JSON.stringify(data)).catch(() => {});
    return data;
  }

  async getWorkTrend(tenantId?: string) {
    const key = `dashboard:work-trend:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.work.calcWorkTrend());
  }

  async getPeopleByDept(tenantId?: string) {
    const key = `dashboard:people-by-dept:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.hr.calcPeopleByDept());
  }

  async getTodayEvents(tenantId?: string) {
    const key = `dashboard:today-events:${tenantId ?? 'default'}`;
    // TTL 1 giờ — sự kiện ngày hôm nay không cần refresh thường xuyên
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit);
    const data = await this.ops.calcTodayEvents();
    await this.redis.setex(key, 3600, JSON.stringify(data)).catch(() => {});
    return data;
  }

  // ─── Attendance & Payroll Dashboard ─────────────────────────────────────────

  async getAttendance(tenantId?: string) {
    const key = `dashboard:attendance:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.hr.calcAttendance());
  }

  async getAttendanceTrend(tenantId?: string) {
    const key = `dashboard:attendance-trend:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.hr.calcAttendanceTrend());
  }

  // ─── Recruit Dashboard ───────────────────────────────────────────────────────

  async getRecruit(tenantId?: string) {
    const key = `dashboard:recruit:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.recruit.calcRecruit());
  }

  // ─── Executive Dashboard ────────────────────────────────────────────────────

  async getExecutive(tenantId?: string) {
    const key = `dashboard:executive:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.ops.calcExecutive(tenantId));
  }
}
