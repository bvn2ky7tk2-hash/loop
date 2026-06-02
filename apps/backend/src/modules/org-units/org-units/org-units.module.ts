import { Module } from '@nestjs/common';
import { OrgUnitsService } from './org-units.service';
import { OrgUnitsController } from './org-units.controller';

@Module({
  providers: [OrgUnitsService],
  controllers: [OrgUnitsController],
  exports: [OrgUnitsService],
})
export class OrgUnitsModule {}
