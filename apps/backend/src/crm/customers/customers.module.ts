import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerSurveyService } from './customer-survey.service';
import { CustomerSurveyController } from './customer-survey.controller';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [CustomersService, CustomerSurveyService],
  controllers: [CustomersController, CustomerSurveyController],
  exports: [CustomersService, CustomerSurveyService],
})
export class CustomersModule {}
