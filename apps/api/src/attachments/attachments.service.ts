import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AttachmentRelatedType, Prisma } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { createReadStream } from "fs";
import { access, mkdir, writeFile } from "fs/promises";
import { basename, join } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { UploadTicketAttachmentDto } from "./dto/upload-ticket-attachment.dto";

const bytesPerMb = 1024 * 1024;
const supportLogoMaxFileMb = 2;
const supportLogoContentTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

export type PreparedAttachmentUpload = {
  originalFileName: string;
  contentType: string;
  bytes: Buffer;
};

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService
  ) {}

  async listTicketAttachments(ticketId: string) {
    await this.ensureTicketExists(ticketId);

    const attachments = await this.prisma.attachment.findMany({
      where: {
        ticketId,
        relatedType: AttachmentRelatedType.TICKET
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { data: attachments };
  }

  async listServiceReportAttachments(serviceReportId: string) {
    await this.ensureServiceReportExists(serviceReportId);

    const attachments = await this.prisma.attachment.findMany({
      where: {
        serviceReportId,
        relatedType: AttachmentRelatedType.SERVICE_REPORT
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { data: attachments };
  }

  async listMachineDocuments(machineId: string) {
    await this.ensureMachineExists(machineId);

    const documents = await this.prisma.attachment.findMany({
      where: {
        machineId,
        relatedType: AttachmentRelatedType.MACHINE_DOCUMENT
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { data: documents };
  }

  async uploadTicketAttachment(ticketId: string, dto: UploadTicketAttachmentDto, uploadedByUserId?: string) {
    await this.ensureTicketExists(ticketId);
    if (uploadedByUserId) await this.ensureUserExists(uploadedByUserId);

    const prepared = await this.prepareTicketAttachments([dto]);
    await this.ensureTicketAttachmentLimit(ticketId, prepared[0].bytes.length);

    const attachment = await this.saveTicketAttachment(ticketId, prepared[0], { uploadedByUserId });

    return { data: attachment };
  }

  async prepareTicketAttachments(dtos: UploadTicketAttachmentDto[] | undefined) {
    const attachments = dtos ?? [];
    const settings = await this.settingsService.getCurrentSettings();
    const maxFileBytes = settings.requestAttachmentMaxFileMb * bytesPerMb;
    const maxTotalBytes = settings.requestAttachmentMaxTotalMb * bytesPerMb;
    const prepared = attachments.map((dto) => this.prepareAttachment(dto, maxFileBytes, settings.requestAttachmentMaxFileMb));
    const totalBytes = prepared.reduce((total, attachment) => total + attachment.bytes.length, 0);

    if (totalBytes > maxTotalBytes) {
      throw new BadRequestException(`Ticket attachments cannot exceed ${settings.requestAttachmentMaxTotalMb} MB in total.`);
    }

    return prepared;
  }

  async saveTicketAttachments(
    ticketId: string,
    preparedAttachments: PreparedAttachmentUpload[],
    options: { uploadedByUserId?: string; uploadedByRequesterName?: string } = {}
  ) {
    if (options.uploadedByUserId) await this.ensureUserExists(options.uploadedByUserId);

    const saved = [];
    for (const prepared of preparedAttachments) {
      saved.push(await this.saveTicketAttachment(ticketId, prepared, options));
    }

    return saved;
  }

  async saveTicketCommentAttachments(
    ticketCommentId: string,
    preparedAttachments: PreparedAttachmentUpload[],
    options: { uploadedByUserId?: string; uploadedByRequesterName?: string } = {}
  ) {
    if (options.uploadedByUserId) await this.ensureUserExists(options.uploadedByUserId);

    const saved = [];
    for (const prepared of preparedAttachments) {
      saved.push(await this.saveTicketCommentAttachment(ticketCommentId, prepared, options));
    }

    return saved;
  }

  async saveMachineLogAttachments(
    machineLogId: string,
    preparedAttachments: PreparedAttachmentUpload[],
    options: { uploadedByUserId?: string; uploadedByRequesterName?: string } = {}
  ) {
    if (options.uploadedByUserId) await this.ensureUserExists(options.uploadedByUserId);

    const saved = [];
    for (const prepared of preparedAttachments) {
      saved.push(await this.saveMachineLogAttachment(machineLogId, prepared, options));
    }

    return saved;
  }

  private async saveTicketAttachment(
    ticketId: string,
    prepared: PreparedAttachmentUpload,
    options: { uploadedByUserId?: string; uploadedByRequesterName?: string } = {}
  ) {
    const attachmentId = randomUUID();
    const safeName = this.safeFileName(prepared.originalFileName);
    const storageKey = join("tickets", ticketId, `${attachmentId}-${safeName}`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);

    await mkdir(this.absolutePath(join("tickets", ticketId)), { recursive: true });
    await writeFile(absolutePath, prepared.bytes);

    return this.prisma.attachment.create({
      data: {
        id: attachmentId,
        relatedType: AttachmentRelatedType.TICKET,
        ticketId,
        uploadedByUserId: options.uploadedByUserId,
        uploadedByRequesterName: options.uploadedByRequesterName,
        originalFileName: prepared.originalFileName,
        contentType: prepared.contentType,
        fileSizeBytes: prepared.bytes.length,
        storageBucket: "local",
        storageKey,
        checksum: createHash("sha256").update(prepared.bytes).digest("hex")
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

  }

  private async saveTicketCommentAttachment(
    ticketCommentId: string,
    prepared: PreparedAttachmentUpload,
    options: { uploadedByUserId?: string; uploadedByRequesterName?: string } = {}
  ) {
    const attachmentId = randomUUID();
    const safeName = this.safeFileName(prepared.originalFileName);
    const storageKey = join("ticket-comments", ticketCommentId, `${attachmentId}-${safeName}`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);

    await mkdir(this.absolutePath(join("ticket-comments", ticketCommentId)), { recursive: true });
    await writeFile(absolutePath, prepared.bytes);

    return this.prisma.attachment.create({
      data: {
        id: attachmentId,
        relatedType: AttachmentRelatedType.TICKET_COMMENT,
        ticketCommentId,
        uploadedByUserId: options.uploadedByUserId,
        uploadedByRequesterName: options.uploadedByRequesterName,
        originalFileName: prepared.originalFileName,
        contentType: prepared.contentType,
        fileSizeBytes: prepared.bytes.length,
        storageBucket: "local",
        storageKey,
        checksum: createHash("sha256").update(prepared.bytes).digest("hex")
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  private async saveMachineLogAttachment(
    machineLogId: string,
    prepared: PreparedAttachmentUpload,
    options: { uploadedByUserId?: string; uploadedByRequesterName?: string } = {}
  ) {
    const attachmentId = randomUUID();
    const safeName = this.safeFileName(prepared.originalFileName);
    const storageKey = join("machine-logs", machineLogId, `${attachmentId}-${safeName}`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);

    await mkdir(this.absolutePath(join("machine-logs", machineLogId)), { recursive: true });
    await writeFile(absolutePath, prepared.bytes);

    return this.prisma.attachment.create({
      data: {
        id: attachmentId,
        relatedType: AttachmentRelatedType.MACHINE_LOG,
        machineLogId,
        uploadedByUserId: options.uploadedByUserId,
        uploadedByRequesterName: options.uploadedByRequesterName,
        originalFileName: prepared.originalFileName,
        contentType: prepared.contentType,
        fileSizeBytes: prepared.bytes.length,
        storageBucket: "local",
        storageKey,
        checksum: createHash("sha256").update(prepared.bytes).digest("hex")
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  async uploadServiceReportAttachment(serviceReportId: string, dto: UploadTicketAttachmentDto, uploadedByUserId?: string) {
    await this.ensureServiceReportExists(serviceReportId);
    if (uploadedByUserId) await this.ensureUserExists(uploadedByUserId);

    const settings = await this.settingsService.getCurrentSettings();
    const { originalFileName, contentType, bytes } = this.prepareAttachment(
      dto,
      settings.serviceReportAttachmentMaxFileMb * bytesPerMb,
      settings.serviceReportAttachmentMaxFileMb
    );

    await this.ensureServiceReportAttachmentLimit(serviceReportId, bytes.length);

    const attachmentId = randomUUID();
    const safeName = this.safeFileName(originalFileName);
    const storageKey = join("service-reports", serviceReportId, `${attachmentId}-${safeName}`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);

    await mkdir(this.absolutePath(join("service-reports", serviceReportId)), { recursive: true });
    await writeFile(absolutePath, bytes);

    const attachment = await this.prisma.attachment.create({
      data: {
        id: attachmentId,
        relatedType: AttachmentRelatedType.SERVICE_REPORT,
        serviceReportId,
        uploadedByUserId,
        originalFileName,
        contentType,
        fileSizeBytes: bytes.length,
        storageBucket: "local",
        storageKey,
        checksum: createHash("sha256").update(bytes).digest("hex")
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return { data: attachment };
  }

  async uploadMachineDocument(machineId: string, dto: UploadTicketAttachmentDto, uploadedByUserId?: string) {
    await this.ensureMachineExists(machineId);
    if (uploadedByUserId) await this.ensureUserExists(uploadedByUserId);

    const prepared = await this.prepareTicketAttachments([dto]);
    const attachment = await this.saveMachineDocument(machineId, prepared[0], { uploadedByUserId });

    return { data: attachment };
  }

  async uploadMachineSupportCompanyLogo(machineId: string, dto: UploadTicketAttachmentDto, uploadedByUserId?: string) {
    await this.ensureMachineExists(machineId);
    if (uploadedByUserId) await this.ensureUserExists(uploadedByUserId);

    const prepared = this.prepareAttachment(dto, supportLogoMaxFileMb * bytesPerMb, supportLogoMaxFileMb);
    if (!supportLogoContentTypes.has(prepared.contentType.toLowerCase())) {
      throw new BadRequestException("Support company logo must be a PNG, JPG, WebP, GIF, or SVG image.");
    }

    const attachmentId = randomUUID();
    const safeName = this.safeFileName(prepared.originalFileName);
    const storageKey = join("machine-support-logos", machineId, `${attachmentId}-${safeName}`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);

    await mkdir(this.absolutePath(join("machine-support-logos", machineId)), { recursive: true });
    await writeFile(absolutePath, prepared.bytes);

    const attachment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          id: attachmentId,
          relatedType: AttachmentRelatedType.MACHINE_SUPPORT_LOGO,
          machineId,
          uploadedByUserId,
          originalFileName: prepared.originalFileName,
          contentType: prepared.contentType,
          fileSizeBytes: prepared.bytes.length,
          storageBucket: "local",
          storageKey,
          checksum: createHash("sha256").update(prepared.bytes).digest("hex")
        },
        include: {
          uploadedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      await tx.machine.update({
        where: { id: machineId },
        data: {
          supportCompanyLogoAttachmentId: created.id
        }
      });

      return created;
    });

    return { data: attachment };
  }

  async clearMachineSupportCompanyLogo(machineId: string) {
    await this.ensureMachineExists(machineId);

    const machine = await this.prisma.machine.update({
      where: { id: machineId },
      data: {
        supportCompanyLogoAttachmentId: null
      },
      select: {
        id: true,
        supportCompanyLogoAttachmentId: true
      }
    });

    return { data: machine };
  }

  private async saveMachineDocument(
    machineId: string,
    prepared: PreparedAttachmentUpload,
    options: { uploadedByUserId?: string } = {}
  ) {
    const attachmentId = randomUUID();
    const safeName = this.safeFileName(prepared.originalFileName);
    const storageKey = join("machine-documents", machineId, `${attachmentId}-${safeName}`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);

    await mkdir(this.absolutePath(join("machine-documents", machineId)), { recursive: true });
    await writeFile(absolutePath, prepared.bytes);

    return this.prisma.attachment.create({
      data: {
        id: attachmentId,
        relatedType: AttachmentRelatedType.MACHINE_DOCUMENT,
        machineId,
        uploadedByUserId: options.uploadedByUserId,
        originalFileName: prepared.originalFileName,
        contentType: prepared.contentType,
        fileSizeBytes: prepared.bytes.length,
        storageBucket: "local",
        storageKey,
        checksum: createHash("sha256").update(prepared.bytes).digest("hex")
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  async saveAcknowledgementSignature(
    acknowledgementId: string,
    signatureDataUrl: string,
    requesterName: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma
  ) {
    const attachmentId = randomUUID();
    const storageKey = join("signatures", acknowledgementId, `${attachmentId}-signature.txt`).replace(/\\/g, "/");
    const absolutePath = this.absolutePath(storageKey);
    const bytes = Buffer.from(signatureDataUrl, "utf8");

    await mkdir(this.absolutePath(join("signatures", acknowledgementId)), { recursive: true });
    await writeFile(absolutePath, bytes);

    return db.attachment.create({
      data: {
        id: attachmentId,
        relatedType: AttachmentRelatedType.ACKNOWLEDGEMENT_SIGNATURE,
        acknowledgementId,
        uploadedByRequesterName: requesterName,
        originalFileName: "signature.txt",
        contentType: "text/plain",
        fileSizeBytes: bytes.length,
        storageBucket: "local",
        storageKey,
        checksum: createHash("sha256").update(bytes).digest("hex")
      }
    });
  }

  async getDownload(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    const absolutePath = this.absolutePath(attachment.storageKey);
    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException("Attachment file is not available.");
    }

    return {
      attachment,
      stream: createReadStream(absolutePath)
    };
  }

  private async ensureTicketExists(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }
  }

  private async ensureServiceReportExists(id: string) {
    const report = await this.prisma.serviceReport.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!report) {
      throw new NotFoundException("Service report not found.");
    }
  }

  private async ensureMachineExists(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }
  }

  private async ensureTicketAttachmentLimit(ticketId: string, incomingBytes: number) {
    const aggregate = await this.prisma.attachment.aggregate({
      where: {
        ticketId,
        relatedType: AttachmentRelatedType.TICKET
      },
      _sum: {
        fileSizeBytes: true
      }
    });

    const currentBytes = aggregate._sum.fileSizeBytes ?? 0;
    const settings = await this.settingsService.getCurrentSettings();
    const maxTotalBytes = settings.requestAttachmentMaxTotalMb * bytesPerMb;
    if (currentBytes + incomingBytes > maxTotalBytes) {
      throw new BadRequestException(`Ticket attachments cannot exceed ${settings.requestAttachmentMaxTotalMb} MB in total.`);
    }
  }

  private async ensureServiceReportAttachmentLimit(serviceReportId: string, incomingBytes: number) {
    const aggregate = await this.prisma.attachment.aggregate({
      where: {
        serviceReportId,
        relatedType: AttachmentRelatedType.SERVICE_REPORT
      },
      _sum: {
        fileSizeBytes: true
      }
    });

    const currentBytes = aggregate._sum.fileSizeBytes ?? 0;
    const settings = await this.settingsService.getCurrentSettings();
    const maxTotalBytes = settings.serviceReportAttachmentMaxTotalMb * bytesPerMb;
    if (currentBytes + incomingBytes > maxTotalBytes) {
      throw new BadRequestException(`Service report attachments cannot exceed ${settings.serviceReportAttachmentMaxTotalMb} MB in total.`);
    }
  }

  private decodeBase64(value: string | undefined) {
    const cleaned = this.requiredString(value, "Attachment data is required.");
    const base64 = cleaned.includes(",") ? cleaned.split(",").pop() ?? "" : cleaned;
    return Buffer.from(base64, "base64");
  }

  private prepareAttachment(dto: UploadTicketAttachmentDto, maxFileBytes: number, maxFileMb: number): PreparedAttachmentUpload {
    const originalFileName = this.requiredString(dto.originalFileName, "File name is required.");
    const contentType = this.requiredString(dto.contentType, "File type is required.");
    const bytes = this.decodeBase64(dto.dataBase64);

    if (bytes.length === 0) {
      throw new BadRequestException("Attachment file cannot be empty.");
    }

    if (bytes.length > maxFileBytes) {
      throw new BadRequestException(`Attachment file must be ${maxFileMb} MB or smaller.`);
    }

    return {
      originalFileName,
      contentType,
      bytes
    };
  }

  private requiredString(value: string | undefined, message: string) {
    const cleaned = value?.trim();
    if (!cleaned) {
      throw new BadRequestException(message);
    }
    return cleaned;
  }

  private safeFileName(value: string) {
    const fileName = basename(value).replace(/[^a-zA-Z0-9._-]/g, "_");
    return fileName || "attachment";
  }

  private absolutePath(storageKey: string) {
    return join(process.env.ATTACHMENT_STORAGE_ROOT ?? "/app/uploads", storageKey);
  }
}
