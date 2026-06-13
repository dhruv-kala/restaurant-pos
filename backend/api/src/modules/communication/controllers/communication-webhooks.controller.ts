import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CommunicationWebhookQueryDto } from '../dto/communication-webhook.dto';
import { CommunicationWebhooksService } from '../services/communication-webhooks.service';

@ApiTags('Communication Webhooks')
@Controller('communication/webhooks')
export class CommunicationWebhooksController {
  constructor(private readonly webhooks: CommunicationWebhooksService) {}

  @Post(':provider')
  ingest(
    @Param('provider') provider: string,
    @Query() query: CommunicationWebhookQueryDto,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.webhooks.ingest(provider, query.providerId, {
      body,
      headers,
      rawBody: request.rawBody ?? Buffer.alloc(0),
    });
  }
}
