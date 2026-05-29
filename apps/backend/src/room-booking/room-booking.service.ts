import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/create-room.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { BookingStatus, Role } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class RoomBookingService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  private tenantFilter() {
    const tid = this.getTenantId();
    return tid ? { bookedBy: { tenantId: tid } } : {};
  }

  // ─── Rooms ───────────────────────────────────────────────────────────────────

  async listRooms(pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.meetingRoom.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { bookings: true } },
        },
      }),
      this.prisma.meetingRoom.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async createRoom(dto: CreateRoomDto) {
    return this.prisma.meetingRoom.create({
      data: {
        name:      dto.name,
        floor:     dto.floor,
        capacity:  dto.capacity ?? 1,
        amenities: dto.amenities ?? [],
        status:    dto.status ?? 'ACTIVE',
        imageUrl:  dto.imageUrl,
      },
    });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    const room = await this.prisma.meetingRoom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Không tìm thấy phòng họp');

    return this.prisma.meetingRoom.update({
      where: { id },
      data: {
        ...(dto.name      !== undefined && { name:      dto.name }),
        ...(dto.floor     !== undefined && { floor:     dto.floor }),
        ...(dto.capacity  !== undefined && { capacity:  dto.capacity }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.status    !== undefined && { status:    dto.status }),
        ...(dto.imageUrl  !== undefined && { imageUrl:  dto.imageUrl }),
      },
    });
  }

  async deleteRoom(id: string) {
    const room = await this.prisma.meetingRoom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Không tìm thấy phòng họp');
    return this.prisma.meetingRoom.delete({ where: { id } });
  }

  async getAvailableRooms(startTime: string, endTime: string) {
    const start = new Date(startTime);
    const end   = new Date(endTime);

    // Tìm roomId đang có booking CONFIRMED overlap với khoảng thời gian yêu cầu
    const busyBookings = await this.prisma.roomBooking.findMany({
      where: {
        status:    BookingStatus.CONFIRMED,
        startTime: { lt: end },
        endTime:   { gt: start },
      },
      select: { roomId: true },
    });

    const busyRoomIds = [...new Set(busyBookings.map((b) => b.roomId))];

    return this.prisma.meetingRoom.findMany({
      where: {
        status: 'ACTIVE',
        id:     busyRoomIds.length > 0 ? { notIn: busyRoomIds } : undefined,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────────

  async listBookings(pagination: PaginationDto & { date?: string }) {
    const { page = 1, limit = 50, date } = pagination;
    const where: any = { ...this.tenantFilter() };

    if (date) {
      const day   = new Date(date);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
      const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      where.startTime = { gte: start, lte: end };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.roomBooking.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { startTime: 'asc' },
        include: {
          room:     { select: { id: true, name: true, floor: true } },
          bookedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.roomBooking.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async createBooking(dto: CreateBookingDto, userId: string) {
    const room = await this.prisma.meetingRoom.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Không tìm thấy phòng họp');

    const start = new Date(dto.startTime);
    const end   = new Date(dto.endTime);

    // Kiểm tra conflict
    const conflict = await this.prisma.roomBooking.findFirst({
      where: {
        roomId:    dto.roomId,
        status:    BookingStatus.CONFIRMED,
        startTime: { lt: end },
        endTime:   { gt: start },
      },
    });

    if (conflict) {
      throw new ConflictException('Phòng đã có lịch trong khung giờ này');
    }

    return this.prisma.roomBooking.create({
      data: {
        roomId:     dto.roomId,
        bookedById: userId,
        title:      dto.title,
        startTime:  start,
        endTime:    end,
        attendees:  dto.attendees ?? [],
        note:       dto.note,
      },
      include: {
        room:     { select: { id: true, name: true, floor: true } },
        bookedBy: { select: { id: true, name: true } },
      },
    });
  }

  async cancelBooking(id: string, userId: string, userRole: Role) {
    const booking = await this.prisma.roomBooking.findUnique({
      where: { id },
      include: { room: true, bookedBy: true },
    });

    if (!booking) throw new NotFoundException('Không tìm thấy booking');

    // Chỉ người đặt hoặc ADMIN mới được hủy
    if (booking.bookedById !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền hủy booking này');
    }

    return this.prisma.roomBooking.update({
      where: { id },
      data:  { status: BookingStatus.CANCELLED },
    });
  }

  async getGanttData(date: string) {
    const day   = new Date(date);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

    const [rooms, bookings] = await this.prisma.$transaction([
      this.prisma.meetingRoom.findMany({
        where:   { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      }),
      this.prisma.roomBooking.findMany({
        where: {
          ...this.tenantFilter(),
          status:    BookingStatus.CONFIRMED,
          startTime: { gte: start },
          endTime:   { lte: end },
        },
        orderBy: { startTime: 'asc' },
        include: {
          room:     { select: { id: true, name: true } },
          bookedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { rooms, bookings };
  }

  async getRoomStats() {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const tf = this.tenantFilter();

    const [totalRooms, activeRooms, maintenanceRooms, todayBookings] = await this.prisma.$transaction([
      this.prisma.meetingRoom.count(),
      this.prisma.meetingRoom.count({ where: { status: 'ACTIVE' } }),
      this.prisma.meetingRoom.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.roomBooking.count({
        where: {
          ...tf,
          status:    BookingStatus.CONFIRMED,
          startTime: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    return { totalRooms, activeRooms, maintenanceRooms, todayBookings };
  }
}
