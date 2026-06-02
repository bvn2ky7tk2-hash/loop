import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCandidateDto } from './create-candidate.dto';

export class UpdateCandidateDto extends PartialType(
  OmitType(CreateCandidateDto, ['jobOpeningId'] as const),
) {}
