import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollConfigService } from './payroll-config.service';
import { PayrollConfigController } from './payroll-config.controller';
import { PayrollEmployeeService } from './payroll-employee.service';
import { PayrollEmployeeController } from './payroll-employee.controller';
import { PayrollEngineService } from './payroll-engine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [PayrollController, PayrollConfigController, PayrollEmployeeController],
  providers: [PayrollService, PayrollConfigService, PayrollEmployeeService, PayrollEngineService],
  exports: [PayrollService, PayrollConfigService, PayrollEmployeeService, PayrollEngineService],
})
export class PayrollModule {}
