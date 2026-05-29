import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HrProfileController } from './hr-profile.controller';
import { HrProfileService } from './hr-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [HrProfileController],
  providers: [HrProfileService],
  exports: [HrProfileService],
})
export class HrProfileModule {}
