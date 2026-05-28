import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { FilterJournalDto } from './dto/filter-journal.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountType } from '../generated/prisma';
import { IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

class FilterAccountsQuery {
  @IsOptional()
  @IsIn(Object.values(AccountType))
  @Transform(({ value }) => value as AccountType)
  type?: AccountType;
}

@Controller('api/v1/accounting')
export class AccountingController {
  constructor(private readonly svc: AccountingService) {}

  // ── Chart of Accounts ───────────────────────────────────────────────────────

  @Get('accounts')
  @RequirePermission('finance:read')
  listAccounts(@Query() q: FilterAccountsQuery) {
    return this.svc.listAccounts(q.type);
  }

  @Get('accounts/:code')
  @RequirePermission('finance:read')
  getAccount(@Param('code') code: string) {
    return this.svc.getAccount(code);
  }

  // ── Journal Entries ─────────────────────────────────────────────────────────

  @Get('journal')
  @RequirePermission('finance:read')
  listJournal(@Query() dto: FilterJournalDto) {
    return this.svc.listJournal(dto);
  }

  @Post('journal')
  @RequirePermission('finance:manage')
  createJournal(@Body() dto: CreateJournalDto, @CurrentUser('sub') userId: string) {
    return this.svc.createJournal(dto, userId);
  }

  // ── Financial Reports ───────────────────────────────────────────────────────

  @Get('reports/profit-loss')
  @RequirePermission('finance:read')
  getProfitLoss(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.svc.getProfitLoss(startDate, endDate);
  }

  @Get('reports/balance-sheet')
  @RequirePermission('finance:read')
  getBalanceSheet(@Query('asOfDate') asOfDate: string) {
    return this.svc.getBalanceSheet(asOfDate);
  }

  @Get('reports/income-statement')
  @RequirePermission('finance:read')
  getIncomeStatement(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.svc.getIncomeStatement(from, to);
  }

  @Get('reports/cash-flow')
  @RequirePermission('finance:read')
  getCashFlowStatement(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.svc.getCashFlowStatement(from, to);
  }
}
