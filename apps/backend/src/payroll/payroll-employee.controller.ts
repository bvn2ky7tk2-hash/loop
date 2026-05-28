import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { PayrollEmployeeService } from './payroll-employee.service';
import {
  UpsertEmployeeTaxProfileDto,
  CreateDependentDto,
  TerminateDependentDto,
  CreateAllowanceTypeDto,
} from './dto/employee-tax-profile.dto';

@ApiTags('payroll-employee')
@ApiBearerAuth()
@Controller('api/v1/payroll')
export class PayrollEmployeeController {
  constructor(private readonly service: PayrollEmployeeService) {}

  // ── Employee Tax Profile ─────────────────────────────────────────────────────

  @Get('employees/:employeeId/tax-profile')
  @ApiOperation({ summary: 'Xem hồ sơ thuế nhân viên' })
  getTaxProfile(@Param('employeeId') employeeId: string) {
    return this.service.getTaxProfile(employeeId);
  }

  @Put('employees/:employeeId/tax-profile')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Tạo/cập nhật hồ sơ thuế nhân viên' })
  upsertTaxProfile(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpsertEmployeeTaxProfileDto,
  ) {
    return this.service.upsertTaxProfile(employeeId, dto);
  }

  // ── Dependents ───────────────────────────────────────────────────────────────

  @Get('employees/:employeeId/dependents')
  @ApiOperation({ summary: 'Danh sách người phụ thuộc của nhân viên' })
  listDependents(@Param('employeeId') employeeId: string) {
    return this.service.listDependents(employeeId);
  }

  @Post('employees/:employeeId/dependents')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Thêm người phụ thuộc' })
  addDependent(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateDependentDto,
  ) {
    return this.service.addDependent(employeeId, dto);
  }

  @Patch('employees/:employeeId/dependents/:dependentId/terminate')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Kết thúc giảm trừ người phụ thuộc' })
  terminateDependent(
    @Param('employeeId') employeeId: string,
    @Param('dependentId') dependentId: string,
    @Body() dto: TerminateDependentDto,
  ) {
    return this.service.terminateDependent(employeeId, dependentId, dto);
  }

  @Delete('employees/:employeeId/dependents/:dependentId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xóa người phụ thuộc' })
  deleteDependent(
    @Param('employeeId') employeeId: string,
    @Param('dependentId') dependentId: string,
  ) {
    return this.service.deleteDependent(employeeId, dependentId);
  }

  // ── Allowance Types ──────────────────────────────────────────────────────────

  @Get('allowance-types')
  @ApiOperation({ summary: 'Danh sách loại phụ cấp' })
  listAllowanceTypes() {
    return this.service.listAllowanceTypes();
  }

  @Post('allowance-types')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tạo loại phụ cấp mới' })
  createAllowanceType(@Body() dto: CreateAllowanceTypeDto) {
    return this.service.createAllowanceType(dto);
  }

  @Patch('allowance-types/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cập nhật loại phụ cấp' })
  updateAllowanceType(
    @Param('id') id: string,
    @Body() dto: Partial<CreateAllowanceTypeDto & { isActive: boolean }>,
  ) {
    return this.service.updateAllowanceType(id, dto);
  }

  // ── Per-record allowance override ─────────────────────────────────────────────

  @Post('records/:recordId/allowances')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @ApiOperation({ summary: 'Override phụ cấp của một nhân viên trong kỳ lương' })
  upsertRecordAllowance(
    @Param('recordId') recordId: string,
    @Body() body: { allowanceTypeId: string; amount: number; overrideNote?: string },
  ) {
    return this.service.upsertRecordAllowance(
      recordId,
      body.allowanceTypeId,
      body.amount,
      body.overrideNote,
    );
  }

  // ── Employee self-service ─────────────────────────────────────────────────────

  @Get('my-tax-profile')
  @ApiOperation({ summary: 'Xem hồ sơ thuế của bản thân (self-service)' })
  getMyTaxProfile(@Req() req: { user: { id: string } }) {
    return this.service.getMyTaxProfile(req.user.id);
  }
}
