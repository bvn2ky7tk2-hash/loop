import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectAnalyticsService } from './project-analytics.service';
import { ProjectAnalyticsController } from './project-analytics.controller';
import { ProjectCostService } from './project-cost.service';
import { ProjectCostTask } from './project-cost.task';
import { EmployeesModule } from '../employees/employees.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [EmployeesModule, PrismaModule, ScheduleModule.forRoot()],
  providers: [ProjectsService, ProjectAnalyticsService, ProjectCostService, ProjectCostTask],
  controllers: [ProjectsController, ProjectAnalyticsController],
  exports: [ProjectsService, ProjectCostService],
})
export class ProjectsModule {}
