import { Module } from '@nestjs/common';

import { CommunicationTemplatesController } from './controllers/communication-templates.controller';
import { CommunicationTemplateRenderer } from './services/communication-template-renderer';
import { CommunicationTemplatesService } from './services/communication-templates.service';
import { CommunicationService } from './services/communication.service';

@Module({
  controllers: [CommunicationTemplatesController],
  providers: [CommunicationService, CommunicationTemplateRenderer, CommunicationTemplatesService],
  exports: [CommunicationService, CommunicationTemplateRenderer, CommunicationTemplatesService],
})
export class CommunicationModule {}
