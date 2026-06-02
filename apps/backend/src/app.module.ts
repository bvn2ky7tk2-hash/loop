import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { OrgScopeInterceptor } from './common/guards/org-scope.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrgUnitsModule } from './modules/org-units/org-units.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CostModule } from './modules/cost/cost.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TimesheetModule } from './modules/timesheet/timesheet.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { TelegramModule } from './modules/integrations/telegram/telegram.module';
import { BugsModule } from './modules/bugs/bugs.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UserGroupsModule } from './modules/user-groups/user-groups.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { StorageModule } from './modules/storage/storage.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SkillsModule } from './modules/skills/skills.module';
import { CrmModule } from './modules/crm/crm.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ScreensModule } from './modules/screens/screens.module';
import { RecruitModule } from './modules/recruit/recruit.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { HrExtModule } from './modules/hr-ext/hr-ext.module';
import { OkrModule } from './modules/okr/okr.module';
import { KbModule } from './modules/kb/kb.module';
import { PortalModule } from './modules/portal/portal.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ImportModule } from './modules/import/import.module';
import { AutomationModule } from './modules/automation/automation.module';
import { ScheduledReportsModule } from './modules/scheduled-reports/scheduled-reports.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FeedModule } from './modules/feed/feed.module';
import { HealthModule } from './modules/admin/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ModuleConfigModule } from './modules/module-config/module-config.module';
import { RoomBookingModule } from './modules/room-booking/room-booking.module';
import { VehicleBookingModule } from './modules/vehicle-booking/vehicle-booking.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { JobTitlesModule } from './modules/job-titles/job-titles.module';
import { PositionsModule } from './modules/positions/positions.module';
import { HrDecisionsModule } from './modules/hr-decisions/hr-decisions.module';
import { SalaryRecordsModule } from './modules/salary-records/salary-records.module';
import { WorkHistoryModule } from './modules/work-history/work-history.module';
import { HrInsuranceModule } from './modules/hr-insurance/hr-insurance.module';
import { HrProfileModule } from './modules/hr-profile/hr-profile.module';
import { LeavePoliciesModule } from './modules/leave-policies/leave-policies.module';
import { HrAttendanceModule } from './modules/hr-attendance/hr-attendance.module';
import { HrHolidaysModule } from './modules/hr-holidays/hr-holidays.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { WorkShiftsModule } from './modules/work-shifts/work-shifts.module';
import { EventsModule } from './common/events/events.module';
import { BudgetModule } from './modules/budget/budget.module';
import { DelegationModule } from './modules/delegation/delegation.module';
// E26: Platform Utilities
import { AnnouncementsModule } from './modules/admin/announcements/announcements.module';
import { PermissionAuditModule } from './modules/admin/permission-audit/permission-audit.module';
import { EmailLogModule } from './modules/admin/email-log/email-log.module';
import { QueuesModule } from './modules/admin/queues/queues.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: OrgScopeInterceptor },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    ThrottlerModule.forRoot({
      throttlers: [
        // Mọi endpoint: 100 req / 60s
        { name: 'global', ttl: 60_000, limit: 100 },
        // Auth endpoint: 10 req / 60s (riêng, áp dụng qua @Throttle decorator)
        { name: 'auth', ttl: 60_000, limit: 10 },
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    AuthModule,
    OrgUnitsModule,
    UsersModule,
    EmployeesModule,
    ProjectsModule,
    TasksModule,
    CostModule,
    NotificationsModule,
    AlertsModule,
    DashboardModule,
    ReportsModule,
    TimesheetModule,
    ProcessesModule,
    TelegramModule,
    BugsModule,
    PermissionsModule,
    UserGroupsModule,
    AuditLogModule,
    StorageModule,
    ContractsModule,
    LeavesModule,
    PayrollModule,
    ExpensesModule,
    SkillsModule,
    CrmModule,
    InvoicesModule,
    ScreensModule,
    RecruitModule,
    AssetsModule,
    AccountingModule,
    HrExtModule,
    OkrModule,
    KbModule,
    PortalModule,
    ProcurementModule,
    ImportModule,
    AutomationModule,
    ScheduledReportsModule,
    CommentsModule,
    FeedModule,
    HealthModule,
    WebhooksModule,
    ModuleConfigModule,
    RoomBookingModule,
    VehicleBookingModule,
    CalendarModule,
    TenantModule,
    // HR v4.0 modules
    JobTitlesModule,
    PositionsModule,
    HrDecisionsModule,
    SalaryRecordsModule,
    WorkHistoryModule,
    HrInsuranceModule,
    HrProfileModule,
    LeavePoliciesModule,
    HrAttendanceModule,
    HrHolidaysModule,
    OvertimeModule,
    WorkShiftsModule,
    EventsModule,
    // Epic E17: Budget Management
    BudgetModule,
    // Epic E23: Delegation & Automation upgrade
    DelegationModule,
    // Epic E26: Platform Utilities
    AnnouncementsModule,
    PermissionAuditModule,
    EmailLogModule,
    QueuesModule,
    ApiKeysModule,
    CategoriesModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
