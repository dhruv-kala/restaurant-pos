import { PartialType, PickType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(
  PickType(CreateEmployeeDto, [
    'outletId',
    'roleId',
    'firstName',
    'lastName',
    'phone',
    'email',
    'gender',
    'dateOfBirth',
    'dateOfJoining',
    'designation',
    'department',
    'employmentType',
    'salary',
    'reportingManagerId',
    'profileImageUrl',
    'preferredLanguage',
    'emergencyContactName',
    'emergencyContactPhone',
    'status',
  ] as const),
) {}
