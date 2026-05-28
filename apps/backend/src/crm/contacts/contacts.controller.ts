import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../permissions/permissions.constants';

class ContactsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  customerId?: string;
}

@ApiTags('CRM — Contacts')
@ApiBearerAuth()
@Controller('api/v1/crm/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Danh sách liên hệ' })
  @ApiQuery({ name: 'customerId', required: false })
  findAll(@Query() query: ContactsQueryDto) {
    return this.contactsService.findAll(
      query.customerId,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'Chi tiết liên hệ' })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Tạo liên hệ' })
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @ApiOperation({ summary: 'Cập nhật liên hệ' })
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermission(PERMISSIONS.CRM_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá liên hệ' })
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
