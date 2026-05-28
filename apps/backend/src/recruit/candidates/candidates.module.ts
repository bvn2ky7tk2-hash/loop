import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { EmployeesModule } from '../../employees/employees.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [EmployeesModule, StorageModule],
  providers: [CandidatesService],
  controllers: [CandidatesController],
  exports: [CandidatesService],
})
export class CandidatesModule {}
