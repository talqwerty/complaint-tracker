import { IsOptional, IsString } from 'class-validator';

// Only these fields are allowed to be patched (mirrors legacy server.js allowlist).
export class UpdateCaseDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  assignee?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  customerContact?: string;
}
