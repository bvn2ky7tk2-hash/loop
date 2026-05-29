import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { ProcessUserTasksService } from './process-user-tasks.service';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { ReturnTaskDto } from './dto/return-task.dto';

@ApiTags('processes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/processes/user-tasks')
export class ProcessUserTasksController {
  constructor(private readonly service: ProcessUserTasksService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách user tasks (inbox)' })
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('instanceId') instanceId?: string,
  ) {
    return this.service.findAll(user.id, page, pageSize, instanceId);
  }

  @Get('count')
  @ApiOperation({ summary: 'Tổng process tasks chưa hoàn thành (toàn bộ)' })
  countAll() {
    return this.service.countAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết user task' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/claim')
  @ApiOperation({ summary: 'Nhận task để xử lý' })
  claim(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.claim(id, user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành user task và tiếp tục process' })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.service.complete(id, user.id, dto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Trả lại task (unassign)' })
  returnTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: ReturnTaskDto,
  ) {
    return this.service.returnTask(id, user.id, dto);
  }
}
