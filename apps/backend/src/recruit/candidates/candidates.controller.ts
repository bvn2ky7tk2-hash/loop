import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiProperty } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsEnum } from 'class-validator';
import { CandidateStage } from '../../generated/prisma';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { FilterCandidateDto } from './dto/filter-candidate.dto';
import { HireCandidateDto } from './dto/hire-candidate.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

class UpdateStageDto {
  @ApiProperty({ enum: CandidateStage })
  @IsEnum(CandidateStage)
  stage!: CandidateStage;
}

@ApiTags('Recruitment — Candidates')
@ApiBearerAuth()
@Controller('api/v1/recruit/candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  @RequirePermission('recruit_candidates:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Tạo ứng viên mới' })
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto);
  }

  @Get()
  @RequirePermission('recruit_candidates:read', PERMISSIONS.RECRUIT_READ)
  @ApiOperation({ summary: 'Danh sách ứng viên' })
  findAll(@Query() filter: FilterCandidateDto) {
    return this.candidatesService.findAll(filter);
  }

  @Get(':id')
  @RequirePermission('recruit_candidates:read', PERMISSIONS.RECRUIT_READ)
  @ApiOperation({ summary: 'Chi tiết ứng viên' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.candidatesService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('recruit_candidates:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Cập nhật ứng viên' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.candidatesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('recruit_candidates:create', PERMISSIONS.RECRUIT_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá ứng viên (chỉ stage APPLIED)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.candidatesService.remove(id);
  }

  @Patch(':id/stage')
  @RequirePermission('recruit_candidates:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Chuyển stage ứng viên' })
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStageDto,
  ) {
    return this.candidatesService.updateStage(id, body.stage);
  }

  @Post(':id/hire')
  @RequirePermission('recruit_candidates:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Onboard ứng viên thành nhân sự' })
  hire(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HireCandidateDto,
    @Req() req: { user?: { sub?: string } },
  ) {
    return this.candidatesService.hire(id, dto, req.user?.sub);
  }

  @Post(':id/cv')
  @RequirePermission('recruit_candidates:create', PERMISSIONS.RECRUIT_MANAGE)
  @ApiOperation({ summary: 'Upload CV ứng viên (PDF/DOC/DOCX, tối đa 10MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadCv(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.candidatesService.uploadCv(id, file);
  }

  @Get(':id/cv-url')
  @RequirePermission('recruit_candidates:read', PERMISSIONS.RECRUIT_READ)
  @ApiOperation({ summary: 'Lấy presigned URL để tải CV' })
  getCvUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.candidatesService.getCvUrl(id);
  }
}
