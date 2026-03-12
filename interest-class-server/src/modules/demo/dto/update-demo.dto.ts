import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';
import { CreateDemoDto } from './create-demo.dto';

export class UpdateDemoDto extends PartialType(CreateDemoDto) {
  @IsString()
  @IsOptional()
  updated_by?: string;
}
