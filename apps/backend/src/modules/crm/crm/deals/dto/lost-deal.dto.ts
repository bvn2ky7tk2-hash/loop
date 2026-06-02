import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LostDealDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lostReason: string;
}
