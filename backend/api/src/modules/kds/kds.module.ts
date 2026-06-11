import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KdsController } from './controllers/kds.controller';
import { KdsEventsService } from './events/kds-events.service';
import { KdsService } from './services/kds.service';

@Module({
  imports: [PrismaModule],
  controllers: [KdsController],
  providers: [KdsService, KdsEventsService],
  exports: [KdsService],
})
export class KdsModule {}
