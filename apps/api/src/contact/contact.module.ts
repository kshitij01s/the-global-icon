import { Body, Controller, HttpCode, HttpStatus, Injectable, Module, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EnquiryType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { randomBytes } from 'node:crypto';
import { OptionalUser } from '../auth/decorators';
import { OptionalJwtAuthGuard } from '../auth/guards';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : trim({ value });

export class CreateEnquiryDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160)
  fullName!: string;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160)
  company!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail() @MaxLength(254)
  email!: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(120)
  jobTitle?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsUrl({ require_protocol: true }) @MaxLength(300)
  website?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(100)
  countryOrRegion?: string;

  @IsEnum(EnquiryType)
  enquiryType!: EnquiryType;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(180)
  subject!: string;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(5000)
  message!: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(100)
  estimatedBudget?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(40)
  preferredContact?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsString() @MaxLength(120)
  preferredFollowUpTime?: string;
}

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnquiryDto, user: AuthUser | null) {
    const enquiry = await this.prisma.enquiry.create({
      data: {
        reference: this.newReference(),
        submittedById: user?.id ?? null,
        fullName: dto.fullName,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        website: dto.website,
        countryOrRegion: dto.countryOrRegion,
        enquiryType: dto.enquiryType,
        subject: dto.subject,
        message: dto.message,
        estimatedBudget: dto.estimatedBudget,
        preferredContact: dto.preferredContact,
        preferredFollowUpTime: dto.preferredFollowUpTime,
      },
      select: { reference: true, submittedAt: true },
    });
    return {
      reference: enquiry.reference,
      submittedAt: enquiry.submittedAt,
      message: 'Thank you. Your enquiry has been received.',
    };
  }

  private newReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TGI-${date}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() dto: CreateEnquiryDto, @OptionalUser() user: AuthUser | null) {
    return this.contact.create(dto, user);
  }
}

@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
