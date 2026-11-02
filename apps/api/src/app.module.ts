import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { validateEnv } from './config/env.validation';
import { LeadersModule } from './leaders/leaders.module';
import { MagazinesModule } from './magazines/magazines.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { PrismaModule } from './prisma/prisma.module';
import { RssModule } from './rss/rss.module';
import { SearchModule } from './search/search.module';
import { SiteModule } from './site/site.module';
import { StorageModule } from './storage/storage.module';
import { ThemesModule } from './themes/themes.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    MagazinesModule,
    ArticlesModule,
    LeadersModule,
    SearchModule,
    ContactModule,
    NewsletterModule,
    SiteModule,
    ThemesModule,
    AdminModule,
    RssModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
