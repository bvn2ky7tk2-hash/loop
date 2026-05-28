import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleModuleDto {
  @ApiProperty({ description: 'Bật/tắt module' })
  @IsBoolean()
  isEnabled: boolean;
}
