import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';

@Module({
  imports: [CustomersModule, ContactsModule, LeadsModule, DealsModule],
})
export class CrmModule {}
