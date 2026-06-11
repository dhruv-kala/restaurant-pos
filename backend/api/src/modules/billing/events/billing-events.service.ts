import { Injectable } from '@nestjs/common';
import type { BillGenerated, BillPaid, BillVoided } from './billing-events';

@Injectable()
export class BillingEventsService {
  publishGenerated(event: BillGenerated): void {
    void event;
  }
  publishPaid(event: BillPaid): void {
    void event;
  }
  publishVoided(event: BillVoided): void {
    void event;
  }
}
