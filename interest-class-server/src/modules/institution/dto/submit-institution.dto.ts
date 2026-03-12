import { IsString } from 'class-validator';

export class SubmitInstitutionDto {
  @IsString()
  institutionId: string;
}
