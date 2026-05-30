import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DelegationController } from './delegation.controller';
import { DelegationService } from './delegation.service';

@Module({
  imports: [PrismaModule],
  controllers: [DelegationController],
  providers: [DelegationService],
  exports: [DelegationService],
})
export class DelegationModule {}
