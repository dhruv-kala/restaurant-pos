import { IsString, MaxLength } from 'class-validator';

export class CreateCustomerNoteDto {
  @IsString()
  @MaxLength(1000)
  note!: string;
}
