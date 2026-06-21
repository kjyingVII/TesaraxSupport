import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { parseNullablePhoneNumber, parseOptionalPhoneNumber } from "../common/phone-number";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerTechniciansDto } from "./dto/update-customer-technicians.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

type ListCustomersInput = {
  search?: string;
  isActive?: string;
  page?: string;
  pageSize?: string;
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(input: ListCustomersInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const where: Prisma.CustomerWhereInput = {};

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search, mode: "insensitive" } }
      ];
    }

    if (input.isActive !== undefined) {
      where.isActive = this.parseBoolean(input.isActive, "isActive");
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.customer.count({ where })
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

  async create(dto: CreateCustomerDto) {
    const name = dto.name?.trim();

    if (!name) {
      throw new BadRequestException("Customer name is required.");
    }

    const customer = await this.prisma.customer.create({
      data: {
        name,
        contactName: this.cleanOptionalString(dto.contactName),
        contactEmail: this.cleanOptionalString(dto.contactEmail),
        contactPhone: parseOptionalPhoneNumber(dto.contactPhone, "Contact phone"),
        address: this.cleanOptionalString(dto.address),
        remarks: this.cleanOptionalString(dto.remarks)
      }
    });

    return { data: customer };
  }

  async getById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        machines: {
          orderBy: { createdAt: "desc" }
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

    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }

    return { data: customer };
  }

  async listTechnicians(id: string) {
    await this.ensureExists(id);

    const assignments = await this.prisma.customerTechnicianAssignment.findMany({
      where: { customerId: id },
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

  async updateTechnicians(id: string, dto: UpdateCustomerTechniciansDto, actorUserId?: string) {
    const before = await this.listTechnicians(id);
    const technicianIds = this.uniqueStrings(dto.technicianIds ?? []);

    for (const technicianId of technicianIds) {
      await this.ensureActiveTechnicianExists(technicianId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customerTechnicianAssignment.deleteMany({
        where: {
          customerId: id,
          technicianId: {
            notIn: technicianIds
          }
        }
      });

      for (const technicianId of technicianIds) {
        await tx.customerTechnicianAssignment.upsert({
          where: {
            customerId_technicianId: {
              customerId: id,
              technicianId
            }
          },
          update: {},
          create: {
            customerId: id,
            technicianId,
            assignedByUserId: actorUserId
          }
        });
      }
    });

    const after = await this.listTechnicians(id);

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_CUSTOMER_TECHNICIANS",
      entityType: "Customer",
      entityId: id,
      beforeData: before.data,
      afterData: after.data
    });

    return after;
  }

  async update(id: string, dto: UpdateCustomerDto, actorUserId?: string) {
    const before = await this.ensureExists(id);

    const data: Prisma.CustomerUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException("Customer name cannot be empty.");
      }
      data.name = name;
    }

    if (dto.contactName !== undefined) data.contactName = this.cleanNullableString(dto.contactName);
    if (dto.contactEmail !== undefined) data.contactEmail = this.cleanNullableString(dto.contactEmail);
    if (dto.contactPhone !== undefined) data.contactPhone = parseNullablePhoneNumber(dto.contactPhone, "Contact phone");
    if (dto.address !== undefined) data.address = this.cleanNullableString(dto.address);
    if (dto.remarks !== undefined) data.remarks = this.cleanNullableString(dto.remarks);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const customer = await this.prisma.customer.update({
      where: { id },
      data
    });

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_CUSTOMER",
      entityType: "Customer",
      entityId: id,
      beforeData: before,
      afterData: customer
    });

    return { data: customer };
  }

  async deactivate(id: string, actorUserId?: string) {
    const before = await this.ensureExists(id);

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { isActive: false }
    });

    await this.auditService.write({
      actorUserId,
      action: "DEACTIVATE_CUSTOMER",
      entityType: "Customer",
      entityId: id,
      beforeData: before,
      afterData: customer
    });

    return { data: customer };
  }

  private async ensureExists(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException("Customer not found.");
    }

    return customer;
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

  private uniqueStrings(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
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

  private cleanOptionalString(value: string | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }

  private cleanNullableString(value: string | null | undefined) {
    if (value === null) return null;
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }
}
