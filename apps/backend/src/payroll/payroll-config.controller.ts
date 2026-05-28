import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { PayrollConfigService } from './payroll-config.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateInsuranceConfigDto } from './dto/create-insurance-config.dto';
import { CreateTaxBracketDto, CreateTaxDeductionConfigDto } from './dto/create-tax-bracket.dto';
import { CreateSalaryColumnDto, UpdateSalaryColumnDto } from './dto/create-salary-column.dto';

@ApiTags('payroll-config')
@ApiBearerAuth()
@Controller('api/v1/payroll')
export class PayrollConfigController {
  constructor(private readonly service: PayrollConfigService) {}

  // ── Insurance Config ─────────────────────────────────────────────────────────

  @Get('insurance-configs')
  @ApiOperation({ summary: 'Danh sách cấu hình bảo hiểm (có phân trang)' })
  listInsuranceConfigs(@Query() query: PaginationDto) {
    return this.service.listInsuranceConfigs(query.page, query.limit);
  }

  @Get('insurance-configs/active')
  @ApiOperation({ summary: 'Cấu hình bảo hiểm đang hiệu lực tại ngày chỉ định' })
  @ApiQuery({ name: 'date', required: false, example: '2026-07-01' })
  getActiveInsuranceConfig(@Query('date') date?: string) {
    return this.service.getActiveInsuranceConfig(date);
  }

  @Post('insurance-configs')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo cấu hình bảo hiểm mới (immutable sau khi dùng)' })
  createInsuranceConfig(
    @Body() dto: CreateInsuranceConfigDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.createInsuranceConfig(dto, req.user.id);
  }

  @Delete('insurance-configs/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa cấu hình bảo hiểm (chỉ khi chưa được dùng)' })
  deleteInsuranceConfig(@Param('id') id: string) {
    return this.service.deleteInsuranceConfig(id);
  }

  // ── Tax Bracket ──────────────────────────────────────────────────────────────

  @Get('tax-brackets')
  @ApiOperation({ summary: 'Danh sách biểu thuế TNCN lũy tiến' })
  listTaxBrackets(@Query() query: PaginationDto) {
    return this.service.listTaxBrackets(query.page, query.limit);
  }

  @Get('tax-brackets/active')
  @ApiOperation({ summary: 'Biểu thuế đang hiệu lực tại ngày chỉ định' })
  @ApiQuery({ name: 'date', required: false, example: '2026-01-15' })
  getActiveTaxBracket(@Query('date') date?: string) {
    return this.service.getActiveTaxBracket(date);
  }

  @Post('tax-brackets')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo biểu thuế mới' })
  createTaxBracket(
    @Body() dto: CreateTaxBracketDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.createTaxBracket(dto, req.user.id);
  }

  @Delete('tax-brackets/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa biểu thuế (chỉ khi chưa được dùng)' })
  deleteTaxBracket(@Param('id') id: string) {
    return this.service.deleteTaxBracket(id);
  }

  // ── Tax Deduction Config ──────────────────────────────────────────────────────

  @Get('tax-deductions')
  @ApiOperation({ summary: 'Danh sách cấu hình giảm trừ gia cảnh' })
  listTaxDeductions(@Query() query: PaginationDto) {
    return this.service.listTaxDeductions(query.page, query.limit);
  }

  @Get('tax-deductions/active')
  @ApiOperation({ summary: 'Giảm trừ gia cảnh đang hiệu lực' })
  @ApiQuery({ name: 'date', required: false })
  getActiveTaxDeduction(@Query('date') date?: string) {
    return this.service.getActiveTaxDeduction(date);
  }

  @Post('tax-deductions')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo cấu hình giảm trừ gia cảnh mới' })
  createTaxDeduction(
    @Body() dto: CreateTaxDeductionConfigDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.createTaxDeduction(dto, req.user.id);
  }

  // ── Salary Column ─────────────────────────────────────────────────────────────

  @Get('salary-columns')
  @ApiOperation({ summary: 'Danh sách cột bảng lương' })
  listSalaryColumns() {
    return this.service.listSalaryColumns();
  }

  @Post('salary-columns')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo cột bảng lương mới' })
  createSalaryColumn(
    @Body() dto: CreateSalaryColumnDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.createSalaryColumn(dto, req.user.id);
  }

  @Patch('salary-columns/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật cột bảng lương (name, sortOrder, isActive, formula, exemptions)' })
  updateSalaryColumn(
    @Param('id') id: string,
    @Body() dto: UpdateSalaryColumnDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.updateSalaryColumn(id, dto, req.user.id);
  }
}
