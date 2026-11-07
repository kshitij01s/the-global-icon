import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiInboxSeverity, ApiInboxStatus } from './api-inbox.enums';

export class ApiInboxListQueryDto {
  @IsOptional()
  @IsEnum(ApiInboxStatus)
  status?: ApiInboxStatus;

  @IsOptional()
  @IsEnum(ApiInboxSeverity)
  severity?: ApiInboxSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

export class ApiInboxPatchDto {
  @IsOptional()
  @IsIn([ApiInboxStatus.ACKNOWLEDGED, ApiInboxStatus.RESOLVED, ApiInboxStatus.OPEN])
  status?: ApiInboxStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  adminNotes?: string;
}

export class ApiInboxSimulateDto {
  @ApiPropertyOptional({ example: 'storage' })
  @IsOptional()
  @IsIn(['storage', 'pdf', 'rss', 'campaign', 'festival', 'html_upstream'])
  scenario?: string = 'storage';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  technicalError?: string;

  @IsOptional()
  @IsEnum(ApiInboxSeverity)
  severity?: ApiInboxSeverity;
}
