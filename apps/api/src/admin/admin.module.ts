import { Module } from '@nestjs/common';
import { ThemesModule } from '../themes/themes.module';
import { AdminAdvertisingController, AdminAdvertisingService } from './advertising';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminArticlesController } from './articles.controller';
import { AdminArticlesService } from './articles.service';
import { AdminEnquiriesController, AdminEnquiriesService } from './enquiries';
import { AdminLeadersController, AdminLeadersService } from './leaders';
import { AdminLookupsController, AdminLookupsService } from './lookups';
import { AdminPagesController, PublicPagesController } from './pages.admin';
import { AdminSettingsController, AdminSettingsService } from './settings';
import { AdminThemesController } from './themes.admin';
import { AdminUploadsController } from './uploads';
import { AdminUsersController, AdminUsersService } from './users';
import { AdminAnnouncementsController } from './announcements.admin';

@Module({
  imports: [ThemesModule],
  controllers: [
    AdminController,
    AdminArticlesController,
    AdminLeadersController,
    AdminEnquiriesController,
    AdminUsersController,
    AdminSettingsController,
    AdminLookupsController,
    AdminUploadsController,
    AdminAdvertisingController,
    AdminThemesController,
    AdminPagesController,
    PublicPagesController,
    AdminAnnouncementsController,
  ],
  providers: [
    AdminService,
    AdminArticlesService,
    AdminLeadersService,
    AdminEnquiriesService,
    AdminUsersService,
    AdminSettingsService,
    AdminLookupsService,
    AdminAdvertisingService,
  ],
})
export class AdminModule {}
