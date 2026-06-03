import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  Scope,
  Logger,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { BpmnEngineService } from '../processes/engine/bpmn-engine.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/create-vehicle.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { VehicleRequestStatus, VehicleStatus, Role, DefinitionStatus, InstanceStatus } from '../generated/prisma';

const VEHICLE_PROCESS_KEY = 'vehicle-booking-approval';

@Injectable({ scope: Scope.REQUEST })
export class VehicleBookingService extends TenantAwareService {
  private readonly logger = new Logger(VehicleBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  private tenantFilter() {
    const tid = this.getTenantId();
    return tid ? { requestedBy: { tenantId: tid } } : {};
  }

  // ─── Vehicles ────────────────────────────────────────────────────────────────

  async listVehicles() {
    return this.prisma.vehicle.findMany({
      orderBy: { name: 'asc' },
      include: {
        driver: { select: { id: true, name: true } },
        _count: { select: { requests: true } },
      },
      take: 200,
    });
  }

  async createVehicle(dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        name:        dto.name,
        plateNumber: dto.plateNumber,
        type:        dto.type,
        seats:       dto.seats ?? 4,
        status:      dto.status ?? VehicleStatus.AVAILABLE,
        driverId:    dto.driverId ?? null,
        imageUrl:    dto.imageUrl ?? null,
      },
    });
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name }),
        ...(dto.plateNumber !== undefined && { plateNumber: dto.plateNumber }),
        ...(dto.type        !== undefined && { type:        dto.type }),
        ...(dto.seats       !== undefined && { seats:       dto.seats }),
        ...(dto.status      !== undefined && { status:      dto.status }),
        ...(dto.driverId    !== undefined && { driverId:    dto.driverId }),
        ...(dto.imageUrl    !== undefined && { imageUrl:    dto.imageUrl }),
      },
    });
  }

  async deleteVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');
    return this.prisma.vehicle.delete({ where: { id } });
  }

  // ─── Requests ────────────────────────────────────────────────────────────────

  async listRequests(userId: string, isAdmin: boolean, page = 1, limit = 50) {
    const tf = this.tenantFilter();
    const where = isAdmin
      ? { ...tf }
      : { ...tf, requestedById: userId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicleRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle:     { select: { id: true, name: true, plateNumber: true, type: true } },
          requestedBy: { select: { id: true, name: true } },
          approvedBy:  { select: { id: true, name: true } },
        },
      }),
      this.prisma.vehicleRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createRequest(dto: CreateRequestDto, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Không tìm thấy xe');

    if (vehicle.status === VehicleStatus.MAINTENANCE || vehicle.status === VehicleStatus.RETIRED) {
      throw new ConflictException('Xe không khả dụng để đặt');
    }

    const start = new Date(dto.startTime);
    const end   = new Date(dto.endTime);

    // Kiểm tra conflict — không cho đặt trùng khung giờ (PENDING hoặc APPROVED hoặc IN_PROGRESS)
    const conflict = await this.prisma.vehicleRequest.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status:    { in: [VehicleRequestStatus.PENDING, VehicleRequestStatus.APPROVED, VehicleRequestStatus.IN_PROGRESS] },
        startTime: { lt: end },
        endTime:   { gt: start },
      },
    });

    if (conflict) {
      throw new ConflictException('Xe đã có lịch trong khung giờ này');
    }

    const vehicleRequest = await this.prisma.vehicleRequest.create({
      data: {
        vehicleId:      dto.vehicleId,
        requestedById:  userId,
        purpose:        dto.purpose,
        destination:    dto.destination,
        startTime:      start,
        endTime:        end,
        passengerCount: dto.passengerCount ?? 1,
        note:           dto.note ?? null,
      },
      include: {
        vehicle:     { select: { id: true, name: true, plateNumber: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    // Auto-start BPM approval process nếu có process definition
    await this.startApprovalProcess(vehicleRequest, userId);

    return vehicleRequest;
  }

  private async startApprovalProcess(vehicleRequest: any, userId: string): Promise<void> {
    try {
      const definition = await this.prisma.processDefinition.findFirst({
        where: { key: VEHICLE_PROCESS_KEY, status: DefinitionStatus.ACTIVE },
        select: { id: true, bpmnXml: true },
      });
      if (!definition) return;

      const variables = {
        vehicleRequestId: vehicleRequest.id,
        vehicleName:  vehicleRequest.vehicle?.name ?? '',
        plateNumber:  vehicleRequest.vehicle?.plateNumber ?? '',
        purpose:      vehicleRequest.purpose,
        destination:  vehicleRequest.destination,
        startTime:    vehicleRequest.startTime,
        endTime:      vehicleRequest.endTime,
      };

      const instance = await this.prisma.processInstance.create({
        data: {
          definitionId: definition.id,
          startedBy:    userId,
          status:       InstanceStatus.RUNNING,
          variables:    variables as any,
          tokenState:   {} as any,
          tenantId:     this.getTenantId() ?? null,
        },
      });

      const tokenState = await this.engineService.start(instance.id, definition.bpmnXml, variables);
      await this.prisma.processInstance.update({
        where: { id: instance.id },
        data:  { tokenState: tokenState as any },
      });

      await this.prisma.vehicleRequest.update({
        where: { id: vehicleRequest.id },
        data:  { processInstanceId: instance.id },
      });

      this.logger.log(`BPM process started for VehicleRequest ${vehicleRequest.id}`);
    } catch (e) {
      this.logger.warn(`Failed to start BPM for VehicleRequest ${vehicleRequest.id}: ${e}`);
    }
  }

  async approveRequest(id: string, approverId: string) {
    const req = await this.prisma.vehicleRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');

    if (req.status !== VehicleRequestStatus.PENDING) {
      throw new ConflictException('Chỉ có thể duyệt yêu cầu đang chờ');
    }

    return this.prisma.$transaction([
      this.prisma.vehicleRequest.update({
        where: { id },
        data:  { status: VehicleRequestStatus.APPROVED, approvedById: approverId },
      }),
      this.prisma.vehicle.update({
        where: { id: req.vehicleId },
        data:  { status: VehicleStatus.IN_USE },
      }),
    ]);
  }

  async rejectRequest(id: string, approverId: string, reason: string) {
    const req = await this.prisma.vehicleRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');

    if (req.status !== VehicleRequestStatus.PENDING) {
      throw new ConflictException('Chỉ có thể từ chối yêu cầu đang chờ');
    }

    return this.prisma.vehicleRequest.update({
      where: { id },
      data:  {
        status:          VehicleRequestStatus.REJECTED,
        approvedById:    approverId,
        rejectionReason: reason,
      },
    });
  }

  async cancelRequest(id: string, userId: string, isAdmin: boolean) {
    const req = await this.prisma.vehicleRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');

    if (!isAdmin && req.requestedById !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy yêu cầu này');
    }

    if (req.status !== VehicleRequestStatus.PENDING) {
      throw new ConflictException('Chỉ có thể hủy yêu cầu đang chờ duyệt');
    }

    return this.prisma.vehicleRequest.update({
      where: { id },
      data:  { status: VehicleRequestStatus.CANCELLED },
    });
  }

  async completeRequest(id: string, userId: string) {
    const req = await this.prisma.vehicleRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');

    if (req.requestedById !== userId) {
      throw new ForbiddenException('Bạn không có quyền hoàn tất yêu cầu này');
    }

    if (req.status !== VehicleRequestStatus.APPROVED && req.status !== VehicleRequestStatus.IN_PROGRESS) {
      throw new ConflictException('Yêu cầu phải đang được duyệt hoặc trong hành trình');
    }

    return this.prisma.$transaction([
      this.prisma.vehicleRequest.update({
        where: { id },
        data:  { status: VehicleRequestStatus.COMPLETED },
      }),
      this.prisma.vehicle.update({
        where: { id: req.vehicleId },
        data:  { status: VehicleStatus.AVAILABLE },
      }),
    ]);
  }

  async getStats() {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const [
      totalVehicles,
      available,
      inUse,
      pendingRequests,
      todayRequests,
    ] = await this.prisma.$transaction([
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
      this.prisma.vehicle.count({ where: { status: VehicleStatus.IN_USE } }),
      this.prisma.vehicleRequest.count({ where: { status: VehicleRequestStatus.PENDING } }),
      this.prisma.vehicleRequest.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    return { totalVehicles, available, inUse, pendingRequests, todayRequests };
  }
}
