import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { CreateMachineDto } from "./dto/create-machine.dto";
import { UpdateMachineDto } from "./dto/update-machine.dto";
import { UpdateMachineTechniciansDto } from "./dto/update-machine-technicians.dto";
import { UpdateServiceReminderDto } from "./dto/update-service-reminder.dto";

type ListMachinesInput = {
  customerId?: string;
  search?: string;
  isActive?: string;
  serviceStatus?: string;
  page?: string;
  pageSize?: string;
};

@Injectable()
export class MachinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService
  ) {}

  async list(input: ListMachinesInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const where: Prisma.MachineWhereInput = {};

    if (input.customerId?.trim()) {
      where.customerId = input.customerId.trim();
    }

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { machineName: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { supportCompanyName: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (input.isActive !== undefined) {
      where.isActive = this.parseBoolean(input.isActive, "isActive");
    }

    await this.applyServiceStatusFilter(where, input.serviceStatus);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.machine.findMany({
        where,
        include: {
          customer: true,
          _count: {
            select: {
              tickets: true,
              logs: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.machine.count({ where })
    ]);

    return {
      data: items.map((item) => this.serializeMachine(item)),
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  async create(dto: CreateMachineDto) {
    const customerId = this.requiredString(dto.customerId, "Customer is required.");
    const machineName = this.requiredString(dto.machineName, "Machine name is required.");
    const model = this.requiredString(dto.model, "Model is required.");
    const serialNumber = this.requiredString(dto.serialNumber, "Serial number is required.");
    const location = this.requiredString(dto.location, "Location is required.");
    const settings = await this.settingsService.getCurrentSettings();
    const serviceReminderIntervalDays = this.requiredPositiveInteger(
      dto.serviceReminderIntervalDays ?? settings.defaultServiceReminderIntervalDays,
      "Service reminder interval is required."
    );

    await this.ensureCustomerExists(customerId);

    const publicId = await this.generatePublicId();
    const publicRequestUrl = this.buildPublicRequestUrl(publicId);
    const machineAccessPassword = this.cleanOptionalString(dto.machineAccessPassword);

    const machine = await this.prisma.machine.create({
      data: {
        publicId,
        customerId,
        machineName,
        model,
        serialNumber,
        location,
        supportCompanyName: this.cleanOptionalString(dto.supportCompanyName),
        qrCodeUrl: publicRequestUrl,
        machineAccessPasswordHash: machineAccessPassword ? this.authService.hashPassword(machineAccessPassword) : undefined,
        machineAccessPasswordUpdatedAt: machineAccessPassword ? new Date() : undefined,
        serviceReminderIntervalDays,
        nextServiceDueAt: this.parseOptionalDate(dto.nextServiceDueAt, "nextServiceDueAt"),
        installationDate: this.parseOptionalDate(dto.installationDate, "installationDate"),
        warrantyExpiryDate: this.parseOptionalDate(dto.warrantyExpiryDate, "warrantyExpiryDate"),
        internalRemarks: this.cleanOptionalString(dto.internalRemarks)
      },
      include: { customer: true }
    });

    return { data: this.serializeMachine(machine) };
  }

  async getById(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        customer: true,
        tickets: {
          orderBy: { createdAt: "desc" },
          take: 10
        },
        logs: {
          orderBy: { workDate: "desc" },
          take: 10
        },
        technicianAssignments: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true
              }
            }
          },
          orderBy: {
            technician: {
              name: "asc"
            }
          }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    return { data: this.serializeMachine(machine) };
  }

  async listTechnicians(id: string) {
    await this.ensureMachineExists(id);

    const assignments = await this.prisma.machineTechnicianAssignment.findMany({
      where: { machineId: id },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true
          }
        }
      },
      orderBy: {
        technician: {
          name: "asc"
        }
      }
    });

    return { data: assignments };
  }

  async updateTechnicians(id: string, dto: UpdateMachineTechniciansDto, actorUserId?: string) {
    const before = await this.listTechnicians(id);
    const technicianIds = this.uniqueStrings(dto.technicianIds ?? []);

    for (const technicianId of technicianIds) {
      await this.ensureActiveTechnicianExists(technicianId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.machineTechnicianAssignment.deleteMany({
        where: {
          machineId: id,
          technicianId: {
            notIn: technicianIds
          }
        }
      });

      for (const technicianId of technicianIds) {
        await tx.machineTechnicianAssignment.upsert({
          where: {
            machineId_technicianId: {
              machineId: id,
              technicianId
            }
          },
          update: {},
          create: {
            machineId: id,
            technicianId,
            assignedByUserId: actorUserId
          }
        });
      }
    });

    const after = await this.listTechnicians(id);

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_MACHINE_TECHNICIANS",
      entityType: "Machine",
      entityId: id,
      beforeData: before.data,
      afterData: after.data
    });

    return after;
  }

  async update(id: string, dto: UpdateMachineDto, actorUserId?: string) {
    const before = await this.ensureMachineExists(id);

    const data: Prisma.MachineUpdateInput = {};

    if (dto.customerId !== undefined) {
      const customerId = this.requiredString(dto.customerId, "Customer cannot be empty.");
      await this.ensureCustomerExists(customerId);
      data.customer = { connect: { id: customerId } };
    }

    if (dto.machineName !== undefined) data.machineName = this.requiredString(dto.machineName, "Machine name cannot be empty.");
    if (dto.model !== undefined) data.model = this.requiredString(dto.model, "Model cannot be empty.");
    if (dto.serialNumber !== undefined) data.serialNumber = this.requiredString(dto.serialNumber, "Serial number cannot be empty.");
    if (dto.location !== undefined) data.location = this.requiredString(dto.location, "Location cannot be empty.");
    if (dto.supportCompanyName !== undefined) data.supportCompanyName = this.cleanNullableString(dto.supportCompanyName);
    if (dto.serviceReminderIntervalDays !== undefined) {
      data.serviceReminderIntervalDays = this.requiredPositiveInteger(
        dto.serviceReminderIntervalDays,
        "Service reminder interval must be a positive integer."
      );
    }
    if (dto.lastServiceAt !== undefined) data.lastServiceAt = this.parseNullableDate(dto.lastServiceAt, "lastServiceAt");
    if (dto.nextServiceDueAt !== undefined) data.nextServiceDueAt = this.parseNullableDate(dto.nextServiceDueAt, "nextServiceDueAt");
    if (dto.installationDate !== undefined) data.installationDate = this.parseNullableDate(dto.installationDate, "installationDate");
    if (dto.warrantyExpiryDate !== undefined) data.warrantyExpiryDate = this.parseNullableDate(dto.warrantyExpiryDate, "warrantyExpiryDate");
    if (dto.internalRemarks !== undefined) data.internalRemarks = this.cleanNullableString(dto.internalRemarks);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.machineAccessPassword !== undefined) {
      const machineAccessPassword = this.cleanNullableString(dto.machineAccessPassword);
      data.machineAccessPasswordHash = machineAccessPassword ? this.authService.hashPassword(machineAccessPassword) : null;
      data.machineAccessPasswordUpdatedAt = machineAccessPassword ? new Date() : null;
      data.qrCodeUrl = this.buildPublicRequestUrl(before.publicId);
    }

    const machine = await this.prisma.machine.update({
      where: { id },
      data,
      include: { customer: true }
    });

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_MACHINE",
      entityType: "Machine",
      entityId: id,
      beforeData: before,
      afterData: machine
    });

    return { data: this.serializeMachine(machine) };
  }

  async getQrCode(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        qrCodeUrl: true,
        machineName: true,
        model: true,
        serialNumber: true,
        location: true,
        isActive: true
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    const publicRequestUrl = machine.qrCodeUrl ?? this.buildPublicRequestUrl(machine.publicId);

    return {
      data: {
        machineId: machine.id,
        publicId: machine.publicId,
        publicRequestUrl,
        qrCodeImageUrl: null,
        machine
      }
    };
  }

  async updateServiceReminder(id: string, dto: UpdateServiceReminderDto, actorUserId?: string) {
    const before = await this.ensureMachineExists(id);

    const data: Prisma.MachineUpdateInput = {};

    if (dto.serviceReminderIntervalDays !== undefined) {
      data.serviceReminderIntervalDays = this.requiredPositiveInteger(
        dto.serviceReminderIntervalDays,
        "Service reminder interval must be a positive integer."
      );
    }

    if (dto.nextServiceDueAt !== undefined) {
      data.nextServiceDueAt = this.parseNullableDate(dto.nextServiceDueAt, "nextServiceDueAt");
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No service reminder fields were provided.");
    }

    const machine = await this.prisma.machine.update({
      where: { id },
      data,
      include: { customer: true }
    });

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_MACHINE_SERVICE_REMINDER",
      entityType: "Machine",
      entityId: id,
      beforeData: before,
      afterData: machine
    });

    return { data: machine };
  }

  private async ensureCustomerExists(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }
  }

  private async ensureActiveTechnicianExists(id: string) {
    const technician = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.TECHNICIAN,
        isActive: true
      },
      select: { id: true }
    });

    if (!technician) {
      throw new NotFoundException("Active technician not found.");
    }
  }

  private async ensureMachineExists(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    return machine;
  }

  private async generatePublicId() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const publicId = randomBytes(12).toString("base64url");
      const existing = await this.prisma.machine.findUnique({
        where: { publicId },
        select: { id: true }
      });
      if (!existing) return publicId;
    }

    throw new Error("Unable to generate unique machine public ID.");
  }

  private buildPublicRequestUrl(publicId: string) {
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    return `${webAppUrl.replace(/\/$/, "")}/m/${publicId}/access`;
  }

  private serializeMachine<T extends { machineAccessPasswordHash?: string | null }>(machine: T) {
    const { machineAccessPasswordHash, ...safeMachine } = machine;
    return {
      ...safeMachine,
      hasMachineAccessPassword: Boolean(machineAccessPasswordHash)
    };
  }

  private async applyServiceStatusFilter(where: Prisma.MachineWhereInput, serviceStatus?: string) {
    if (!serviceStatus) return;

    const now = new Date();
    const settings = await this.settingsService.getCurrentSettings();
    const upcoming = new Date(now);
    upcoming.setDate(upcoming.getDate() + settings.reminderWindowDays);

    switch (serviceStatus) {
      case "OK":
        where.nextServiceDueAt = { gt: upcoming };
        return;
      case "UPCOMING":
        where.nextServiceDueAt = { gt: now, lte: upcoming };
        return;
      case "DUE":
        where.nextServiceDueAt = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
        return;
      case "OVERDUE":
        where.nextServiceDueAt = { lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
        return;
      case "NO_REMINDER":
        where.nextServiceDueAt = null;
        return;
      default:
        throw new BadRequestException("serviceStatus must be OK, UPCOMING, DUE, OVERDUE, or NO_REMINDER.");
    }
  }

  private requiredString(value: string | undefined, message: string) {
    const cleaned = value?.trim();
    if (!cleaned) {
      throw new BadRequestException(message);
    }
    return cleaned;
  }

  private requiredPositiveInteger(value: number | undefined, message: string) {
    if (!Number.isInteger(value) || value === undefined || value < 1) {
      throw new BadRequestException(message);
    }
    return value;
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

  private parseOptionalDate(value: string | undefined, fieldName: string) {
    if (!value) return undefined;
    return this.parseDate(value, fieldName);
  }

  private parseNullableDate(value: string | null | undefined, fieldName: string) {
    if (value === null) return null;
    if (value === undefined) return undefined;
    return this.parseDate(value, fieldName);
  }

  private parseDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }
    return date;
  }

  private cleanOptionalString(value: string | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }

  private cleanNullableString(value: string | null | undefined) {
    if (value === null) return null;
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private uniqueStrings(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  }
}
