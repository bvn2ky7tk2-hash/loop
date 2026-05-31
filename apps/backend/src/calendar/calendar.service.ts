import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Role } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class CalendarService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  private tenantEventFilter() {
    const tid = this.getTenantId();
    return tid ? { createdBy: { tenantId: tid } } : {};
  }

  private tenantBookingFilter() {
    const tid = this.getTenantId();
    return tid ? { bookedBy: { tenantId: tid } } : {};
  }

  async listEvents(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    return this.prisma.calendarEvent.findMany({
      where: {
        ...this.tenantEventFilter(),
        startTime: { lte: toDate },
        endTime: { gte: fromDate },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 500,
    });
  }

  async listRoomBookings(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    return this.prisma.roomBooking.findMany({
      where: {
        ...this.tenantBookingFilter(),
        startTime: { lte: toDate },
        endTime: { gte: fromDate },
        status: 'CONFIRMED',
      },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        bookedBy: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 500,
    });
  }

  async getMonthView(year: number, month: number) {
    // Build range for the full calendar month (with padding)
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);

    // Pad to include partial weeks at start/end
    const from = new Date(firstDay);
    from.setDate(from.getDate() - 7);
    const to = new Date(lastDay);
    to.setDate(to.getDate() + 7);

    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    const [events, bookings] = await Promise.all([
      this.listEvents(fromStr, toStr),
      this.listRoomBookings(fromStr, toStr),
    ]);

    // Normalise bookings into a calendar-event-like shape for the frontend
    const normalisedBookings = bookings.map((b) => ({
      id: `booking-${b.id}`,
      title: `[${b.room.name}] ${b.title}`,
      description: b.note ?? undefined,
      eventType: 'ROOM_BOOKING' as const,
      startTime: b.startTime,
      endTime: b.endTime,
      isAllDay: false,
      location: b.room.floor ?? b.room.name,
      color: '#F59E0B',
      attendees: b.attendees,
      createdBy: b.bookedBy,
      roomName: b.room.name,
      bookingId: b.id,
    }));

    return {
      year,
      month,
      events,
      bookings: normalisedBookings,
    };
  }

  async createEvent(dto: CreateEventDto, userId: string) {
    return this.prisma.calendarEvent.create({
      data: {
        title:       dto.title,
        description: dto.description,
        eventType:   dto.eventType ?? 'MEETING',
        startTime:   new Date(dto.startTime),
        endTime:     new Date(dto.endTime),
        isAllDay:    dto.isAllDay ?? false,
        location:    dto.location,
        color:       dto.color,
        attendees:   dto.attendees ?? [],
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async updateEvent(
    id: string,
    dto: UpdateEventDto,
    userId: string,
    userRole: Role,
  ) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện');

    const isAdmin = userRole === Role.ADMIN || userRole === Role.LEADERSHIP;
    if (event.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sự kiện này');
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.startTime !== undefined && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime !== undefined && { endTime: new Date(dto.endTime) }),
        ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.attendees !== undefined && { attendees: dto.attendees }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async deleteEvent(id: string, userId: string, userRole: Role) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện');

    const isAdmin = userRole === Role.ADMIN || userRole === Role.LEADERSHIP;
    if (event.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xóa sự kiện này');
    }

    await this.prisma.calendarEvent.delete({ where: { id } });
    return { success: true };
  }
}
