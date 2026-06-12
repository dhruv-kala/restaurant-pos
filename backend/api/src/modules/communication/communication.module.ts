import { Module } from '@nestjs/common';

import { CommunicationService } from './services/communication.service';

@Module({
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
