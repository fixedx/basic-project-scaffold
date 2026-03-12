import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateClassroomDto } from './create-classroom.dto';

export class UpdateClassroomDto extends PartialType(
  OmitType(CreateClassroomDto, ['institution_id'] as const),
) {}
