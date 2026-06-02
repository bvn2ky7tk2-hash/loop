import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectAnalyticsService } from './project-analytics.service';
import { ProjectAnalyticsController } from './project-analytics.controller';
import { ProjectCostService } from './project-cost.service';
import { ProjectCostTask } from './project-cost.task';
import { ProjectJournalService } from './project-journal.service';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [EmployeesModule],
  providers: [
    ProjectsService,
    ProjectAnalyticsService,
    ProjectCostService,
    ProjectCostTask,
    ProjectJournalService,
  ],
  controllers: [ProjectsController, ProjectAnalyticsController],
  exports: [ProjectsService, ProjectCostService, ProjectJournalService],
})
export class ProjectsModule {}
