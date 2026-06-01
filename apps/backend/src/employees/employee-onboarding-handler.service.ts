import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrEventBus, HrEvent } from '../common/events/hr-event-bus.service';

/**
 * Lắng nghe event employee.onboarded, tự động tạo ProcessInstance + ProcessUserTask đầu tiên
 * (HRDocuments) mà không cần BpmnEngineService (tránh DI request-scope conflict).
 */
@Injectable()
export class EmployeeOnboardingHandlerService implements OnModuleInit {
  private readonly logger = new Logger(EmployeeOnboardingHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hrEventBus: HrEventBus,
  ) {}

  onModuleInit() {
    this.hrEventBus.on('employee.onboarded', async (event: HrEvent) => {
      await this.handleEmployeeOnboarded(event);
    });
    this.logger.log('EmployeeOnboardingHandlerService: đã đăng ký lắng nghe employee.onboarded');
  }

  private async handleEmployeeOnboarded(event: HrEvent): Promise<void> {
    const { employeeId, metadata } = event;

    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: 'employee-onboarding-v1', status: 'ACTIVE' as any },
    });

    if (!definition) {
      this.logger.warn('EmployeeOnboardingHandler: không tìm thấy ProcessDefinition key=employee-onboarding-v1 ACTIVE');
      return;
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true, fullName: true },
    });

    if (!employee) {
      this.logger.warn(`EmployeeOnboardingHandler: không tìm thấy employee ${employeeId}`);
      return;
    }

    const startedBy = event.userId ?? employee.userId ?? await this.getAdminUserId();
    if (!startedBy) {
      this.logger.warn(`EmployeeOnboardingHandler: không có user hợp lệ cho employee ${employeeId}`);
      return;
    }

    const startedByUser = await this.prisma.user.findUnique({
      where: { id: startedBy },
      select: { tenantId: true },
    });

    const variables = {
      employeeId,
      candidateId:   metadata?.['candidateId']   ?? null,
      startDate:     metadata?.['startDate']      ?? null,
      orgUnitId:     metadata?.['orgUnitId']      ?? null,
      employeeName:  employee.fullName,
    };

    // Tạo ProcessInstance với tokenState phản ánh bước đầu tiên
    const instance = await this.prisma.processInstance.create({
      data: {
        definitionId: definition.id,
        startedBy,
        status:      'RUNNING'   as any,
        variables:   variables   as any,
        tokenState:  { currentStep: 'HRDocuments' } as any,
        ...(startedByUser?.tenantId ? { tenantId: startedByUser.tenantId } : {}),
      },
    });

    // Tạo ProcessUserTask đầu tiên (HRDocuments) để HR thấy trong inbox
    await this.prisma.processUserTask.create({
      data: {
        instanceId:      instance.id,
        activityId:      'HRDocuments',
        name:            'HR hoàn thiện hồ sơ nhân viên mới',
        status:          'PENDING' as any,
        candidateRoles:  ['HR', 'ADMIN'],
      },
    });

    this.logger.log(
      `EmployeeOnboardingHandler: đã tạo onboarding process cho ${employee.fullName} (instance=${instance.id})`,
    );
  }

  private async getAdminUserId(): Promise<string | null> {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' as any, isActive: true },
      select: { id: true },
    });
    return admin?.id ?? null;
  }
}
