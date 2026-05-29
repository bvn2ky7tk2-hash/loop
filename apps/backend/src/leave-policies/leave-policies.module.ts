import { Module } from '@nestjs/common';
import { LeavePoliciesController } from './leave-policies.controller';
import { LeavePoliciesService } from './leave-policies.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeavePoliciesController],
  providers: [LeavePoliciesService],
  exports: [LeavePoliciesService],
})
export class LeavePoliciesModule {}
