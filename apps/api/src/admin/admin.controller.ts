import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthUser } from '../common/types';
import { AdminService } from './admin.service';
import {
  AdminMagazineListQueryDto,
  CreateMagazineDto,
  UpdateMagazineDto,
} from './dto';

/** Every route requires authentication plus explicit permissions. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('magazines')
  @RequirePermissions(PERMISSIONS.MAGAZINES_READ_ADMIN)
  listMagazines(@Query() query: AdminMagazineListQueryDto) {
    return this.admin.listMagazines(query);
  }

  @Get('magazines/:id')
  @RequirePermissions(PERMISSIONS.MAGAZINES_READ_ADMIN)
  getMagazine(@Param('id') id: string) {
    return this.admin.getMagazine(id);
  }

  @Post('magazines')
  @RequirePermissions(PERMISSIONS.MAGAZINES_CREATE)
  createMagazine(@Body() dto: CreateMagazineDto, @CurrentUser() user: AuthUser) {
    return this.admin.createMagazine(dto, user);
  }

  @Patch('magazines/:id')
  @RequirePermissions(PERMISSIONS.MAGAZINES_UPDATE)
  updateMagazine(
    @Param('id') id: string,
    @Body() dto: UpdateMagazineDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.updateMagazine(id, dto, user);
  }

  @Post('magazines/:id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MAGAZINES_PUBLISH)
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.admin.publishMagazine(id, user);
  }

  @Post('magazines/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MAGAZINES_PUBLISH)
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.admin.unpublishMagazine(id, user);
  }

  @Delete('magazines/:id')
  @RequirePermissions(PERMISSIONS.MAGAZINES_DELETE)
  deleteMagazine(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.admin.deleteMagazine(id, user);
  }
}
