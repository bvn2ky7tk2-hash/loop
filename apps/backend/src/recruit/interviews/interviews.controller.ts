import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewResultDto } from './dto/update-interview-result.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

@ApiTags('Recruitment — Interviews')
@ApiBearerAuth()
@Controller('api/v1/recruit/interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @RequirePermission('recruit_interviews:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Tạo lịch phỏng vấn' })
  create(@Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(dto);
  }

  @Get()
  @RequirePermission('recruit_interviews:read', PERMISSIONS.RECRUIT_READ)
  @ApiOperation({ summary: 'Danh sách phỏng vấn (lọc theo candidateId, hoặc trả tất cả)' })
  @ApiQuery({ name: 'candidateId', required: false, type: String })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('candidateId') candidateId?: string,
    @Query('page')  page  = 1,
    @Query('limit') limit = 20,
  ) {
    if (candidateId) return this.interviewsService.findByCandidateId(candidateId);
    return this.interviewsService.findAll(+page, +limit);
  }

  @Patch(':id/result')
  @RequirePermission('recruit_interviews:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Cập nhật kết quả phỏng vấn' })
  updateResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewResultDto,
  ) {
    return this.interviewsService.updateResult(id, dto);
  }
}
