import { Body, Controller, HttpCode, HttpStatus, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class SubscribeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Explicit consent is required. */
  @IsBoolean()
  consent!: boolean;
}

export class UnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  token!: string;
}

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent; responds identically for new and existing addresses. */
  async subscribe(dto: SubscribeDto) {
    if (!dto.consent) {
      return { subscribed: false, message: 'Consent is required to subscribe.' };
    }
    await this.prisma.newsletterSubscriber.upsert({
      where: { email: dto.email },
      create: { email: dto.email },
      update: { isActive: true, unsubscribedAt: null, consentedAt: new Date() },
    });
    return { subscribed: true, message: 'Thank you for subscribing.' };
  }

  async unsubscribe(dto: UnsubscribeDto) {
    await this.prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: dto.token, isActive: true },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
    return { unsubscribed: true, message: 'You have been unsubscribed.' };
  }
}

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletter.unsubscribe(dto);
  }
}

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
