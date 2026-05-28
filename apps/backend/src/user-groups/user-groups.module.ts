import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserGroupsController } from './user-groups.controller';
import { UserGroupsService } from './user-groups.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserGroupsController],
  providers: [UserGroupsService],
  exports: [UserGroupsService],
})
export class UserGroupsModule {}
