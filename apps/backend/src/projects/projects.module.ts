import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectAnalyticsService } from './project-analytics.service';
import { ProjectAnalyticsController } from './project-analytics.controller';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [EmployeesModule],
  providers: [ProjectsService, ProjectAnalyticsService],
  controllers: [ProjectsController, ProjectAnalyticsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
