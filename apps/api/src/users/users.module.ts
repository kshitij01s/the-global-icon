import { Body, Controller, Get, Injectable, Module, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  firstName?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  lastName?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(auth: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException();
    return { ...user, roles: auth.roles, permissions: auth.permissions };
  }

  async updateProfile(auth: AuthUser, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: auth.id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName || null } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName || null } : {}),
      },
    });
    return this.profile(auth);
  }
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.profile(user);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user, dto);
  }
}

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
