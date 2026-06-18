import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const database = await this.prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;

    return {
      data: {
        status: "ok",
        service: "support-system-api",
        database: {
          status: "ok",
          timestamp: database[0]?.now
        }
      }
    };
  }
}
