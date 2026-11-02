import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';

const toBool = ({ value }: { value: unknown }): unknown =>
  value === 'true' || value === '1' || value === true
    ? true
    : value === 'false' || value === '0' || value === false
      ? false
      : value;

export class MagazineListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(110)
  category?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year?: number;
}

export class EditionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(110)
  series?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year?: number;
}

export class PdfQueryDto {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  download?: boolean;
}

export class SaveProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;
}
