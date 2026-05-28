import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { ClientContractsModule } from './client-contracts/client-contracts.module';

@Module({
  imports: [CustomersModule, ContactsModule, LeadsModule, DealsModule, ClientContractsModule],
})
export class CrmModule {}
