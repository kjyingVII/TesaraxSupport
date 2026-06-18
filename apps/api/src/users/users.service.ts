import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChangeOwnPasswordDto } from "./dto/change-own-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetUserPasswordDto } from "./dto/reset-user-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

type ListUsersInput = {
  search?: string;
  role?: string;
  isActive?: string;
  page?: string;
  pageSize?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService
  ) {}

  async list(input: ListUsersInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const where: Prisma.UserWhereInput = {};

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } }
      ];
    }

    if (input.role?.trim()) {
      where.role = this.parseRole(input.role);
    }

    if (input.isActive !== undefined) {
      where.isActive = this.parseBoolean(input.isActive, "isActive");
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: this.userSelect()
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data: items,
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  async create(dto: CreateUserDto, actorUserId?: string) {
    const name = this.requiredString(dto.name, "User name is required.");
    const email = this.requiredString(dto.email, "Email is required.").toLowerCase();
    const role = this.parseRole(dto.role);
    const password = this.requiredPassword(dto.password);

    await this.ensureEmailAvailable(email);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        phone: this.cleanNullableString(dto.phone),
        role,
        passwordHash: this.authService.hashPassword(password),
        isActive: dto.isActive ?? true
      },
      select: this.userSelect()
    });

    await this.auditService.write({
      actorUserId,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      afterData: user
    });

    return { data: user };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect()
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return { data: user };
  }

  async getProfile(id: string) {
    const user = await this.ensureExists(id);
    return { data: user };
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const before = await this.ensureExists(id);
    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.requiredString(dto.name, "Name cannot be empty.");
    }

    if (dto.email !== undefined) {
      const email = this.requiredString(dto.email, "Email cannot be empty.").toLowerCase();
      await this.ensureEmailAvailable(email, id);
      data.email = email;
    }

    if (dto.phone !== undefined) data.phone = this.cleanNullableString(dto.phone);

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No profile fields were provided.");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect()
    });

    await this.auditService.write({
      actorUserId: id,
      action: "UPDATE_OWN_PROFILE",
      entityType: "User",
      entityId: id,
      beforeData: before,
      afterData: user
    });

    return { data: user };
  }

  async changeOwnPassword(id: string, dto: ChangeOwnPasswordDto) {
    const currentPassword = this.requiredString(dto.currentPassword, "Current password is required.");
    const newPassword = this.requiredPassword(dto.newPassword);

    const before = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSelect(),
        passwordHash: true
      }
    });

    if (!before) {
      throw new NotFoundException("User not found.");
    }

    if (!this.authService.verifyUserPassword(currentPassword, before.passwordHash)) {
      throw new BadRequestException("Current password is incorrect.");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: this.authService.hashPassword(newPassword)
      },
      select: this.userSelect()
    });

    const { passwordHash: _passwordHash, ...beforeData } = before;
    await this.auditService.write({
      actorUserId: id,
      action: "CHANGE_OWN_PASSWORD",
      entityType: "User",
      entityId: id,
      beforeData,
      afterData: user
    });

    return { data: user };
  }

  async update(id: string, dto: UpdateUserDto, actorUserId?: string) {
    const before = await this.ensureExists(id);

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = this.requiredString(dto.name, "User name cannot be empty.");
    }

    if (dto.email !== undefined) {
      const email = this.requiredString(dto.email, "Email cannot be empty.").toLowerCase();
      await this.ensureEmailAvailable(email, id);
      data.email = email;
    }

    if (dto.phone !== undefined) data.phone = this.cleanNullableString(dto.phone);
    if (dto.role !== undefined) data.role = this.parseRole(dto.role);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect()
    });

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: id,
      beforeData: before,
      afterData: user
    });

    return { data: user };
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto, actorUserId?: string) {
    const before = await this.ensureExists(id);
    const password = this.requiredPassword(dto.password);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: this.authService.hashPassword(password)
      },
      select: this.userSelect()
    });

    await this.auditService.write({
      actorUserId,
      action: "RESET_USER_PASSWORD",
      entityType: "User",
      entityId: id,
      beforeData: before,
      afterData: user
    });

    return { data: user };
  }

  private userSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    } satisfies Prisma.UserSelect;
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect()
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  private async ensureEmailAvailable(email: string, currentUserId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    if (existing && existing.id !== currentUserId) {
      throw new ConflictException("Email is already used by another user.");
    }
  }

  private parseRole(value: string | UserRole | undefined) {
    if (!value) {
      throw new BadRequestException("Role is required.");
    }

    if (value === UserRole.ADMIN || value === UserRole.SUPERVISOR || value === UserRole.TECHNICIAN) {
      return value;
    }

    throw new BadRequestException("Role must be ADMIN, SUPERVISOR, or TECHNICIAN.");
  }

  private requiredString(value: string | undefined, message: string) {
    const cleaned = value?.trim();
    if (!cleaned) {
      throw new BadRequestException(message);
    }
    return cleaned;
  }

  private requiredPassword(value: string | undefined) {
    const cleaned = value?.trim();
    if (!cleaned || cleaned.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters.");
    }
    return cleaned;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("Pagination values must be positive integers.");
    }

    return Math.min(parsed, 100);
  }

  private parseBoolean(value: string, fieldName: string) {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new BadRequestException(`${fieldName} must be true or false.`);
  }

  private cleanNullableString(value: string | null | undefined) {
    if (value === null) return null;
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }
}
