import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { ClientContractsModule } from './client-contracts/client-contracts.module';
import { CrmActivitiesModule } from './activities/crm-activities.module';
import { ForecastModule } from './forecast/forecast.module';
import { CrmAnalyticsService } from './crm-analytics.service';
import { CrmAnalyticsController } from './crm-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CrmReminderTask } from './crm-reminder.task';

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    ClientContractsModule,
    CrmActivitiesModule,
    ForecastModule,
  ],
  providers: [CrmAnalyticsService, CrmReminderTask],
  controllers: [CrmAnalyticsController],
})
export class CrmModule {}
