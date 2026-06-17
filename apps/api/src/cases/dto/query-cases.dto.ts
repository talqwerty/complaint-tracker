import { IsOptional, IsString } from 'class-validator';

export class QueryCasesDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
