import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma';
import { TenantAwareService } from '../common/services/tenant-aware.service';

export interface BugStatsFilter {
  projectId?: string;
  orgUnitIds: string[] | null;
}

@Injectable({ scope: Scope.REQUEST })
export class BugStatsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getStats(filter: BugStatsFilter) {
    const tenantId = this.getTenantId();
    const projectFilter = {
      ...(filter.orgUnitIds !== null ? { orgUnitId: { in: filter.orgUnitIds } } : {}),
      ...(tenantId ? { tenantId } : {}),
    };
    const baseWhere: Prisma.BugWhereInput = {
      ...(Object.keys(projectFilter).length ? { project: projectFilter } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
    };

    const [byStatus, bySeverity, openByProject, openByTask, openByAssignee, openByReporter, trend] = await Promise.all([
      this.getByStatus(baseWhere),
      this.getBySeverity(baseWhere),
      this.getOpenByProject(filter),
      this.getOpenByTask(filter),
      this.getOpenByAssignee(filter),
      this.getOpenByReporter(filter),
      this.getTrend30Days(filter),
    ]);

    return { byStatus, bySeverity, openByProject, openByTask, openByAssignee, openByReporter, trend };
  }

  private async getByStatus(where: Prisma.BugWhereInput) {
    const rows = await this.prisma.bug.groupBy({
      by:    ['status'],
      where,
      _count: true,
    });

    return {
      open:          this.pluck(rows, 'OPEN'),
      pending:       this.pluck(rows, 'PENDING'),
      pendingReview: this.pluck(rows, 'PENDING_REVIEW'),
      approved:      this.pluck(rows, 'APPROVED'),
      inProgress:    this.pluck(rows, 'IN_PROGRESS'),
      resolved:      this.pluck(rows, 'RESOLVED'),
      closed:        this.pluck(rows, 'CLOSED'),
      cancelled:     this.pluck(rows, 'CANCELLED'),
      rejected:      this.pluck(rows, 'REJECTED'),
    };
  }

  private async getBySeverity(where: Prisma.BugWhereInput) {
    const rows = await this.prisma.bug.groupBy({
      by:    ['severity'],
      where,
      _count: true,
    });

    return {
      critical: this.pluck(rows, 'CRITICAL'),
      high:     this.pluck(rows, 'HIGH'),
      medium:   this.pluck(rows, 'MEDIUM'),
      low:      this.pluck(rows, 'LOW'),
    };
  }

  private async getOpenByProject(filter: BugStatsFilter) {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<
      { projectId: string; projectName: string; open: bigint; critical: bigint; total: bigint }[]
    >(Prisma.sql`
      SELECT
        b.project_id            AS "projectId",
        p.name                  AS "projectName",
        COUNT(*) FILTER (WHERE b.status = 'OPEN')       AS open,
        COUNT(*) FILTER (WHERE b.severity = 'CRITICAL') AS critical,
        COUNT(*)                                          AS total
      FROM bugs b
      JOIN projects p ON p.id = b.project_id
      WHERE 1=1
        ${filter.orgUnitIds !== null ? Prisma.sql`AND p.org_unit_id = ANY(${filter.orgUnitIds})` : Prisma.sql``}
        ${filter.projectId ? Prisma.sql`AND b.project_id = ${filter.projectId}` : Prisma.sql``}
        ${tenantId ? Prisma.sql`AND p.tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY b.project_id, p.name
      ORDER BY total DESC
      LIMIT 10
    `);

    return rows.map((r) => ({
      projectId:   r.projectId,
      projectName: r.projectName,
      open:        Number(r.open),
      critical:    Number(r.critical),
      total:       Number(r.total),
    }));
  }

  private async getOpenByTask(filter: BugStatsFilter) {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<
      { taskId: string; taskTitle: string; projectName: string; openCount: bigint }[]
    >(Prisma.sql`
      SELECT
        t.id          AS "taskId",
        t.title       AS "taskTitle",
        p.name        AS "projectName",
        COUNT(DISTINCT bt.bug_id) FILTER (
          WHERE b.status NOT IN ('CLOSED','CANCELLED')
        ) AS "openCount"
      FROM tasks t
      JOIN bug_tasks bt ON bt.task_id = t.id
      JOIN bugs b       ON b.id = bt.bug_id
      JOIN projects p   ON p.id = t.project_id
      WHERE 1=1
        ${filter.orgUnitIds !== null ? Prisma.sql`AND p.org_unit_id = ANY(${filter.orgUnitIds})` : Prisma.sql``}
        ${filter.projectId ? Prisma.sql`AND p.id = ${filter.projectId}` : Prisma.sql``}
        ${tenantId ? Prisma.sql`AND p.tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY t.id, t.title, p.name
      ORDER BY "openCount" DESC
      LIMIT 10
    `);

    return rows.map((r) => ({
      taskId:      r.taskId,
      taskTitle:   r.taskTitle,
      projectName: r.projectName,
      openCount:   Number(r.openCount),
    }));
  }

  private async getOpenByAssignee(filter: BugStatsFilter) {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<
      { assigneeId: string; assigneeName: string; open: bigint; critical: bigint; total: bigint }[]
    >(Prisma.sql`
      SELECT
        u.id                AS "assigneeId",
        u.name              AS "assigneeName",
        COUNT(*) FILTER (WHERE b.status NOT IN ('CLOSED','CANCELLED'))                          AS "open",
        COUNT(*) FILTER (WHERE b.status NOT IN ('CLOSED','CANCELLED') AND b.severity = 'CRITICAL') AS "critical",
        COUNT(*)            AS "total"
      FROM bugs b
      JOIN users u    ON u.id = b.assignee_id
      JOIN projects p ON p.id = b.project_id
      WHERE b.assignee_id IS NOT NULL
        ${filter.orgUnitIds !== null ? Prisma.sql`AND p.org_unit_id = ANY(${filter.orgUnitIds})` : Prisma.sql``}
        ${filter.projectId ? Prisma.sql`AND b.project_id = ${filter.projectId}` : Prisma.sql``}
        ${tenantId ? Prisma.sql`AND p.tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY u.id, u.name
      ORDER BY "open" DESC
      LIMIT 15
    `);

    return rows.map((r) => ({
      assigneeId:   r.assigneeId,
      assigneeName: r.assigneeName,
      open:         Number(r.open),
      critical:     Number(r.critical),
      total:        Number(r.total),
    }));
  }

  private async getOpenByReporter(filter: BugStatsFilter) {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<
      { reporterId: string; reporterName: string; open: bigint; critical: bigint; total: bigint }[]
    >(Prisma.sql`
      SELECT
        u.id                AS "reporterId",
        u.name              AS "reporterName",
        COUNT(*) FILTER (WHERE b.status NOT IN ('CLOSED','CANCELLED'))                               AS "open",
        COUNT(*) FILTER (WHERE b.status NOT IN ('CLOSED','CANCELLED') AND b.severity = 'CRITICAL')   AS "critical",
        COUNT(*)            AS "total"
      FROM bugs b
      JOIN users u    ON u.id = b.reporter_id
      JOIN projects p ON p.id = b.project_id
      WHERE 1=1
        ${filter.orgUnitIds !== null ? Prisma.sql`AND p.org_unit_id = ANY(${filter.orgUnitIds})` : Prisma.sql``}
        ${filter.projectId ? Prisma.sql`AND b.project_id = ${filter.projectId}` : Prisma.sql``}
        ${tenantId ? Prisma.sql`AND p.tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY u.id, u.name
      ORDER BY "total" DESC
      LIMIT 15
    `);

    return rows.map((r) => ({
      reporterId:   r.reporterId,
      reporterName: r.reporterName,
      open:         Number(r.open),
      critical:     Number(r.critical),
      total:        Number(r.total),
    }));
  }

  private async getTrend30Days(filter: BugStatsFilter) {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<
      { date: Date; created: bigint; resolved: bigint }[]
    >(Prisma.sql`
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          '1 day'
        )::date AS date
      )
      SELECT
        d.date,
        COUNT(b.id) FILTER (WHERE b.created_at::date = d.date)          AS created,
        COUNT(b.id) FILTER (WHERE b.status = 'RESOLVED'
          AND b.updated_at::date = d.date)                               AS resolved
      FROM dates d
      LEFT JOIN bugs b ON b.created_at::date <= d.date
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = b.project_id
            ${filter.orgUnitIds !== null ? Prisma.sql`AND p.org_unit_id = ANY(${filter.orgUnitIds})` : Prisma.sql``}
            ${filter.projectId ? Prisma.sql`AND p.id = ${filter.projectId}` : Prisma.sql``}
            ${tenantId ? Prisma.sql`AND p.tenant_id = ${tenantId}` : Prisma.sql``}
        )
      GROUP BY d.date
      ORDER BY d.date
    `);

    return rows.map((r) => ({
      date:     r.date.toISOString().slice(0, 10),
      created:  Number(r.created),
      resolved: Number(r.resolved),
    }));
  }

  private pluck(rows: { status?: string; severity?: string; _count: number }[], val: string) {
    return rows.find((r) => r.status === val || r.severity === val)?._count ?? 0;
  }
}
