import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateOutletDto } from './create-outlet.dto';

export class UpdateOutletDto extends PartialType(
  OmitType(CreateOutletDto, ['tenantId', 'status'] as const),
) {}
