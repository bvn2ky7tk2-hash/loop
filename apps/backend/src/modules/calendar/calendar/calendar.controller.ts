import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CalendarRangeQueryDto, CalendarMonthQueryDto } from './dto/calendar-query.dto';

@Controller('api/v1/calendar')
export class CalendarController {
  constructor(private readonly svc: CalendarService) {}

  @Get('events')
  listEvents(@Query() q: CalendarRangeQueryDto) {
    return this.svc.listEvents(q.from, q.to);
  }

  @Get('month')
  getMonthView(@Query() q: CalendarMonthQueryDto, @Request() req: any) {
    const now = new Date();
    const year = q.year ?? now.getFullYear();
    const month = q.month ?? now.getMonth() + 1;
    return this.svc.getMonthView(year, month);
  }

  @Post('events')
  createEvent(@Body() dto: CreateEventDto, @Request() req: any) {
    return this.svc.createEvent(dto, req.user.id);
  }

  @Patch('events/:id')
  updateEvent(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Request() req: any,
  ) {
    return this.svc.updateEvent(id, dto, req.user.id, req.user.role);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string, @Request() req: any) {
    return this.svc.deleteEvent(id, req.user.id, req.user.role);
  }
}
