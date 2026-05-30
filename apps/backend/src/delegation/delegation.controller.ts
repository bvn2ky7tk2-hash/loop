import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DelegationService } from './delegation.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('api/v1/delegation/rules')
export class DelegationController {
  constructor(private readonly svc: DelegationService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() pagination: PaginationDto) {
    return this.svc.listRules(user.id, pagination);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateDelegationDto) {
    return this.svc.create(user.id, dto);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.delete(id, user.id);
  }
}
