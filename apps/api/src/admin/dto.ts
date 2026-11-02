import { PartialType } from '@nestjs/swagger';
import { MagazineAccess, MagazineReviewStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Storage keys only — never absolute or traversing paths. */
export const PDF_KEY_PATTERN = /^magazines\/pdfs\/(?!.*\.\.)[\w\-. /]+\.pdf$/i;
export const COVER_KEY_PATTERN =
  /^(?:demo-pdf-covers|magazines\/covers)\/(?!.*\.\.)[\w\-. /]+\.(?:png|jpe?g|webp)$/i;

export class CreateMagazineDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200)
  title!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(240)
  subtitle?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  publisherName?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  issueNumber?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  editionSeriesId?: string;

  @IsOptional() @IsString() @Matches(COVER_KEY_PATTERN, { message: 'coverImage must be a valid storage key' })
  coverImage?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(180)
  coverAltText?: string;

  @IsOptional() @IsString() @Matches(PDF_KEY_PATTERN, { message: 'pdfKey must be a valid storage key under magazines/pdfs/' })
  pdfKey?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000)
  pageCount?: number;

  @IsOptional() @IsEnum(MagazineAccess)
  access?: MagazineAccess;

  @IsOptional() @IsBoolean()
  allowDownload?: boolean;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  /** ISO date, e.g. 2026-10-01 */
  @IsDateString({ strict: false })
  publicationDate!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  metaDescription?: string;
}

export class UpdateMagazineDto extends PartialType(CreateMagazineDto) {
  @IsOptional() @IsEnum(MagazineReviewStatus)
  reviewStatus?: MagazineReviewStatus;
}

export class AdminMagazineListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(MagazineReviewStatus)
  reviewStatus?: MagazineReviewStatus;
}
