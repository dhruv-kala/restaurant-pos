import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CalculateTaxDto } from '../dto/tax-calculation.dto';
import { TaxCalculationService } from '../services/tax-calculation.service';

@ApiTags('Tax Calculation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax')
export class TaxCalculationController {
  constructor(private readonly taxCalculation: TaxCalculationService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate tenant tax for order or bill lines' })
  @ApiOkResponse()
  calculate(@Body() dto: CalculateTaxDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.taxCalculation.calculate(dto, actor);
  }
}
