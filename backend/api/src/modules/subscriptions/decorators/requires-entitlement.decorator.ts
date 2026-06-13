import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ENTITLEMENT_KEY = 'requiredEntitlement';

export const RequiresEntitlement = (featureKey: string) =>
  SetMetadata(REQUIRED_ENTITLEMENT_KEY, featureKey);
