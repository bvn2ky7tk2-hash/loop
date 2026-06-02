import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProjectCostService } from './project-cost.service';

/**
 * E20.1 — Daily snapshot chi phí dự án.
 * Chạy lúc 00:30 mỗi ngày để tổng hợp labor cost + expense cost toàn bộ project ACTIVE.
 *
 * ProjectCostService là singleton (không REQUEST-scoped) nên inject trực tiếp được.
 */
@Injectable()
export class ProjectCostTask {
  private readonly logger = new Logger(ProjectCostTask.name);

  constructor(private readonly projectCostService: ProjectCostService) {}

  @Cron('30 0 * * *')
  async handleDailyCostSnapshot(): Promise<void> {
    this.logger.log('[ProjectCostTask] Trigger daily cost snapshot...');
    await this.projectCostService.snapshotAllActiveProjects();
  }
}
