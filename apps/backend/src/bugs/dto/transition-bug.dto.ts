import { IsEnum } from 'class-validator';
import { BugStatus } from '../../generated/prisma';

export class TransitionBugDto {
  @IsEnum(BugStatus)
  toStatus: BugStatus;
}
