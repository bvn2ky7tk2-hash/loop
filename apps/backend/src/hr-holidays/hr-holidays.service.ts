import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HolidayType } from '../generated/prisma';
import { BulkCreateHolidayDto, CreateHolidayDto } from './dto/holiday.dto';

interface VnHolidayDef {
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
}

// Ngày lễ Việt Nam 2026
const VN_HOLIDAYS_2026: VnHolidayDef[] = [
  { date: '2026-01-01', name: 'Tết Dương lịch', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-01-28', name: 'Tết Âm lịch 2026 (Ngày 1)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-01-29', name: 'Tết Âm lịch 2026 (Ngày 2)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-01-30', name: 'Tết Âm lịch 2026 (Ngày 3)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-01-31', name: 'Tết Âm lịch 2026 (Ngày 4)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-02-01', name: 'Tết Âm lịch 2026 (Ngày 5)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-02-02', name: 'Tết Âm lịch 2026 (Ngày 6)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-04-30', name: 'Ngày Giải phóng Miền Nam', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-05-01', name: 'Ngày Quốc tế Lao động', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2026-09-02', name: 'Ngày Quốc khánh', type: HolidayType.NATIONAL_HOLIDAY },
];

// Ngày lễ Việt Nam 2027 (ước tính)
const VN_HOLIDAYS_2027: VnHolidayDef[] = [
  { date: '2027-01-01', name: 'Tết Dương lịch', type: HolidayType.NATIONAL_HOLIDAY },
  // Tết Âm lịch 2027: 15/02 — 21/02 (Mậu Ngọ → Kỷ Mùi, năm 2027 Tết khoảng 15/02)
  { date: '2027-02-15', name: 'Tết Âm lịch 2027 (Ngày 1)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-02-16', name: 'Tết Âm lịch 2027 (Ngày 2)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-02-17', name: 'Tết Âm lịch 2027 (Ngày 3)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-02-18', name: 'Tết Âm lịch 2027 (Ngày 4)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-02-19', name: 'Tết Âm lịch 2027 (Ngày 5)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-02-20', name: 'Tết Âm lịch 2027 (Ngày 6)', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-04-30', name: 'Ngày Giải phóng Miền Nam', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-05-01', name: 'Ngày Quốc tế Lao động', type: HolidayType.NATIONAL_HOLIDAY },
  { date: '2027-09-02', name: 'Ngày Quốc khánh', type: HolidayType.NATIONAL_HOLIDAY },
];

@Injectable()
export class HrHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. Lấy danh sách ngày lễ trong năm ─────────────────────────────────────
  async list(year?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    return this.prisma.holidayCalendar.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  // ─── 2. Tạo mới ngày lễ ─────────────────────────────────────────────────────
  async create(dto: CreateHolidayDto) {
    return this.prisma.holidayCalendar.create({
      data: {
        date: new Date(dto.date),
        name: dto.name,
        type: dto.type,
        year: new Date(dto.date).getFullYear(),
      },
    });
  }

  // ─── 3. Tạo nhiều ngày lễ — bỏ qua trùng (upsert by date) ──────────────────
  async bulkCreate(dto: BulkCreateHolidayDto) {
    const results = await Promise.all(
      dto.holidays.map((h) =>
        (async () => {
          const _e = await this.prisma.holidayCalendar.findFirst({
            where: { date: new Date(h.date) },
          });
          const _r = _e
            ? await this.prisma.holidayCalendar.update({
                where: { id: _e.id },
                data: { name: h.name, type: h.type },
              })
            : await this.prisma.holidayCalendar.create({
                data: {
                  date: new Date(h.date),
                  name: h.name,
                  type: h.type,
                  year: new Date(h.date).getFullYear(),
                },
              });
          return _r;
        })(),
      ),
    );

    return {
      message: `Đã tạo/cập nhật ${results.length} ngày lễ`,
      count: results.length,
    };
  }

  // ─── 4. Xóa ngày lễ ─────────────────────────────────────────────────────────
  async delete(id: string) {
    const holiday = await this.prisma.holidayCalendar.findUnique({
      where: { id },
    });
    if (!holiday) throw new NotFoundException('Không tìm thấy ngày lễ');

    await this.prisma.holidayCalendar.delete({ where: { id } });

    return { message: 'Đã xóa ngày lễ thành công' };
  }

  // ─── 5. Seed ngày lễ VN 2026 và 2027 ────────────────────────────────────────
  async seedVN2026() {
    const allHolidays = [...VN_HOLIDAYS_2026, ...VN_HOLIDAYS_2027];

    const results = await Promise.all(
      allHolidays.map((h) =>
        (async () => {
          const _e = await this.prisma.holidayCalendar.findFirst({
            where: { date: new Date(h.date) },
          });
          const _r = _e
            ? await this.prisma.holidayCalendar.update({
                where: { id: _e.id },
                data: { name: h.name, type: h.type },
              })
            : await this.prisma.holidayCalendar.create({
                data: {
                  date: new Date(h.date),
                  name: h.name,
                  type: h.type,
                  year: new Date(h.date).getFullYear(),
                },
              });
          return _r;
        })(),
      ),
    );

    return {
      message: `Đã seed ${results.length} ngày lễ VN (2026 và 2027)`,
      count: results.length,
      holidays: results.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        name: r.name,
        type: r.type,
      })),
    };
  }
}
