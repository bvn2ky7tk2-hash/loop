import { Module } from '@nestjs/common';
import { HrHolidaysController } from './hr-holidays.controller';
import { HrHolidaysService } from './hr-holidays.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HrHolidaysController],
  providers: [HrHolidaysService],
  exports: [HrHolidaysService],
})
export class HrHolidaysModule {}
