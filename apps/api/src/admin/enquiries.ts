import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EnquiryStatus, EnquiryType, Prisma } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { writeAudit } from '../common/audit';
import { PaginationQueryDto, paginated, resolvePaging } from '../common/pagination';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

export class EnquiryListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @IsOptional() @IsEnum(EnquiryType)
  enquiryType?: EnquiryType;

  @IsOptional() @IsString() @MaxLength(40)
  assignedToId?: string;
}

export class UpdateEnquiryStatusDto {
  @IsEnum(EnquiryStatus)
  status!: EnquiryStatus;
}

export class AssignEnquiryDto {
  /** User id of an active staff member, or null to unassign. */
  @IsOptional() @IsString() @MaxLength(40)
  assigneeId?: string | null;
}

export class UpdateEnquiryNotesDto {
  @IsString() @MaxLength(10_000)
  internalNotes!: string;

  @IsOptional() @IsDateString({ strict: false })
  followUpAt?: string | null;
}

const assigneeSelect = { id: true, email: true, firstName: true, lastName: true } as const;

@Injectable()
export class AdminEnquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EnquiryListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 20);
    const term = query.q?.trim();
    const where: Prisma.EnquiryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.enquiryType ? { enquiryType: query.enquiryType } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(term
        ? {
            OR: [
              { reference: { contains: term, mode: 'insensitive' } },
              { fullName: { contains: term, mode: 'insensitive' } },
              { company: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { subject: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.enquiry.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          reference: true,
          fullName: true,
          company: true,
          email: true,
          enquiryType: true,
          subject: true,
          status: true,
          assignedTo: { select: assigneeSelect },
          followUpAt: true,
          submittedAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.enquiry.count({ where }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async get(id: string) {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id },
      include: { assignedTo: { select: assigneeSelect } },
    });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    // `submissionToken` is a client-side idempotency secret; never return it.
    const { submissionToken: _token, ...safe } = enquiry;
    void _token;
    return safe;
  }

  async updateStatus(id: string, dto: UpdateEnquiryStatusDto, actor: AuthUser) {
    const before = await this.get(id);
    await this.prisma.enquiry.update({ where: { id }, data: { status: dto.status } });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Enquiry',
      eventType: 'enquiry.status_changed',
      objectId: id,
      objectRepr: before.reference,
      details: { from: before.status, to: dto.status },
    });
    return this.get(id);
  }

  async assign(id: string, dto: AssignEnquiryDto, actor: AuthUser) {
    const before = await this.get(id);
    const assigneeId = dto.assigneeId ?? null;
    if (assigneeId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: assigneeId },
        select: { isActive: true, roles: { select: { role: { select: { name: true } } } } },
      });
      if (!assignee || !assignee.isActive) throw new BadRequestException('Assignee not found or inactive');
      const isStaff = assignee.roles.some(
        (r) => r.role.name !== 'READER' && r.role.name !== 'SUBSCRIBER',
      );
      if (!isStaff) throw new BadRequestException('Assignee must be a staff member');
    }
    await this.prisma.enquiry.update({ where: { id }, data: { assignedToId: assigneeId } });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Enquiry',
      eventType: 'enquiry.assigned',
      objectId: id,
      objectRepr: before.reference,
      details: { assigneeId },
    });
    return this.get(id);
  }

  async updateNotes(id: string, dto: UpdateEnquiryNotesDto, actor: AuthUser) {
    const before = await this.get(id);
    await this.prisma.enquiry.update({
      where: { id },
      data: {
        internalNotes: dto.internalNotes,
        ...(dto.followUpAt !== undefined
          ? { followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null }
          : {}),
      },
    });
    // Note text is not copied into the audit log (may contain personal data).
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Enquiry',
      eventType: 'enquiry.notes_updated',
      objectId: id,
      objectRepr: before.reference,
    });
    return this.get(id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/enquiries')
export class AdminEnquiriesController {
  constructor(private readonly enquiries: AdminEnquiriesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ENQUIRIES_VIEW)
  list(@Query() query: EnquiryListQueryDto) {
    return this.enquiries.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ENQUIRIES_VIEW)
  get(@Param('id') id: string) {
    return this.enquiries.get(id);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.ENQUIRIES_MANAGE)
  status(@Param('id') id: string, @Body() dto: UpdateEnquiryStatusDto, @CurrentUser() user: AuthUser) {
    return this.enquiries.updateStatus(id, dto, user);
  }

  @Patch(':id/assign')
  @RequirePermissions(PERMISSIONS.ENQUIRIES_MANAGE)
  assign(@Param('id') id: string, @Body() dto: AssignEnquiryDto, @CurrentUser() user: AuthUser) {
    return this.enquiries.assign(id, dto, user);
  }

  @Patch(':id/notes')
  @RequirePermissions(PERMISSIONS.ENQUIRIES_MANAGE)
  notes(@Param('id') id: string, @Body() dto: UpdateEnquiryNotesDto, @CurrentUser() user: AuthUser) {
    return this.enquiries.updateNotes(id, dto, user);
  }
}
