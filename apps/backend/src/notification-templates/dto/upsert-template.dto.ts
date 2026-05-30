import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpsertNotifTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  subject: string;

  @IsString() @IsNotEmpty()
  bodyHtml: string;
}
