import { Injectable } from '@nestjs/common';
import type {
  PaymentCompleted,
  PaymentCreated,
  PaymentFailed,
  PaymentRefunded,
} from './payment-events';

@Injectable()
export class PaymentEventsService {
  publishCreated(event: PaymentCreated): void {
    void event;
  }
  publishCompleted(event: PaymentCompleted): void {
    void event;
  }
  publishFailed(event: PaymentFailed): void {
    void event;
  }
  publishRefunded(event: PaymentRefunded): void {
    void event;
  }
}
