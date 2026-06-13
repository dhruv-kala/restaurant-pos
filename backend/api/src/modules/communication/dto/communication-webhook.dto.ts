import { IsUUID } from 'class-validator';

export class CommunicationWebhookQueryDto {
  @IsUUID('all')
  providerId!: string;
}
