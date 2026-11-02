import { PartialType } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const ARTICLE_IMAGE_KEY_PATTERN =
  /^articles\/(?!.*\.\.)[\w\-. /]+\.(?:png|jpe?g|webp)$/i;

export class CreateArticleDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(240)
  title!: string;

  @IsOptional() @IsString() @MaxLength(600)
  excerpt?: string | null;

  @IsString() @IsNotEmpty() @MaxLength(200_000)
  body!: string;

  @IsOptional() @IsString() @Matches(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/, { message: 'language must be a BCP-47 code such as "en"' })
  language?: string;

  @IsOptional() @IsString()
  authorId?: string | null;

  @IsOptional() @IsString()
  categoryId?: string | null;

  @IsOptional() @IsString() @Matches(ARTICLE_IMAGE_KEY_PATTERN, { message: 'featuredImage must be a storage key under articles/' })
  featuredImage?: string | null;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsBoolean()
  isSponsored?: boolean;

  @IsOptional() @IsBoolean()
  memberOnly?: boolean;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  metaDescription?: string | null;
}

/** Statuses that may be set through PATCH. Publishing has its own endpoint. */
export const EDITABLE_ARTICLE_STATUSES = [
  ArticleStatus.DRAFT,
  ArticleStatus.IN_REVIEW,
  ArticleStatus.CHANGES_REQUESTED,
  ArticleStatus.APPROVED,
  ArticleStatus.ARCHIVED,
] as const;

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @IsOptional() @IsIn(EDITABLE_ARTICLE_STATUSES)
  status?: (typeof EDITABLE_ARTICLE_STATUSES)[number];
}

export class AdminArticleListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
