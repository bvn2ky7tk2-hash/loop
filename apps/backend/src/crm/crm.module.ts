import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { ClientContractsModule } from './client-contracts/client-contracts.module';
import { CrmActivitiesModule } from './activities/crm-activities.module';
import { ForecastModule } from './forecast/forecast.module';

@Module({
  imports: [
    CustomersModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    ClientContractsModule,
    CrmActivitiesModule,
    ForecastModule,
  ],
})
export class CrmModule {}
