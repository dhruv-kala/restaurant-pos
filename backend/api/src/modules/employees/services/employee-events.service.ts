import { Injectable } from '@nestjs/common';
import { EmployeeEvent } from '../enums/employee-events';

@Injectable()
export class EmployeeEventsService {
  publish(_event: {
    type: EmployeeEvent;
    tenantId: string;
    outletId: string;
    referenceId: string;
  }): void {
    void _event;
    // Durable transport is intentionally deferred; this is the typed event boundary.
  }
}
