import { Injectable } from '@nestjs/common';
import type { RecipeEventName } from '../enums/recipe-events';

@Injectable()
export class RecipeEventsService {
  publish(event: {
    type: RecipeEventName;
    tenantId: string;
    outletId?: string;
    referenceId?: string;
  }): void {
    void event;
    // Durable transport is intentionally deferred.
  }
}
