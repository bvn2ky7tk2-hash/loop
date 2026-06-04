import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { HealthController } from './health.controller';
import { HealthPublicController } from './health-public.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, HealthPublicController],
  providers: [HealthService],
})
export class HealthModule {}
