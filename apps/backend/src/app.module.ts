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
import { AuthModule } from './auth/auth.module';
import { OrgUnitsModule } from './org-units/org-units.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CostModule } from './cost/cost.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { ProcessesModule } from './processes/processes.module';
import { TelegramModule } from './integrations/telegram/telegram.module';
import { BugsModule } from './bugs/bugs.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UserGroupsModule } from './user-groups/user-groups.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { StorageModule } from './storage/storage.module';
import { ContractsModule } from './contracts/contracts.module';
import { LeavesModule } from './leaves/leaves.module';
import { PayrollModule } from './payroll/payroll.module';
import { ExpensesModule } from './expenses/expenses.module';
import { SkillsModule } from './skills/skills.module';
import { CrmModule } from './crm/crm.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ScreensModule } from './screens/screens.module';
import { RecruitModule } from './recruit/recruit.module';
import { AssetsModule } from './assets/assets.module';
import { AccountingModule } from './accounting/accounting.module';
import { HrExtModule } from './hr-ext/hr-ext.module';
import { OkrModule } from './okr/okr.module';
import { KbModule } from './kb/kb.module';
import { PortalModule } from './portal/portal.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ImportModule } from './import/import.module';
import { AutomationModule } from './automation/automation.module';
import { ScheduledReportsModule } from './scheduled-reports/scheduled-reports.module';
import { CommentsModule } from './comments/comments.module';
import { FeedModule } from './feed/feed.module';
import { HealthModule } from './admin/health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ModuleConfigModule } from './module-config/module-config.module';
import { RoomBookingModule } from './room-booking/room-booking.module';
import { VehicleBookingModule } from './vehicle-booking/vehicle-booking.module';
import { CalendarModule } from './calendar/calendar.module';
import { TenantModule } from './tenant/tenant.module';
import { JobTitlesModule } from './job-titles/job-titles.module';
import { PositionsModule } from './positions/positions.module';
import { HrDecisionsModule } from './hr-decisions/hr-decisions.module';
import { SalaryRecordsModule } from './salary-records/salary-records.module';
import { WorkHistoryModule } from './work-history/work-history.module';
import { HrInsuranceModule } from './hr-insurance/hr-insurance.module';
import { HrProfileModule } from './hr-profile/hr-profile.module';
import { LeavePoliciesModule } from './leave-policies/leave-policies.module';
import { HrAttendanceModule } from './hr-attendance/hr-attendance.module';
import { HrHolidaysModule } from './hr-holidays/hr-holidays.module';
import { OvertimeModule } from './overtime/overtime.module';
import { WorkShiftsModule } from './work-shifts/work-shifts.module';
import { EventsModule } from './common/events/events.module';
import { BudgetModule } from './budget/budget.module';

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
  ],
})
export class AppModule {}
