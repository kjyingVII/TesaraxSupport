import { Injectable } from "@nestjs/common";
import { Prisma, TaskStatus, TaskVisibility, TicketStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type WorkDashboardInput = {
  userId: string;
  scope?: string;
  search?: string;
};

type DashboardItem = {
  id: string;
  recordType: "TICKET" | "TASK";
  title: string;
  subtitle: string | null;
  customerName: string;
  machineName: string;
  machineSerialNumber: string;
  startAt: Date | null;
  dueAt: Date | null;
  status: string;
  priority: string;
  visibility?: string;
  assignedTo: Array<{ id: string; name: string; role: string }>;
  href: string;
  isOverdue: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type DashboardActivityItem = {
  id: string;
  activityType: "MACHINE_LOG" | "TICKET_STATUS";
  title: string;
  description: string;
  customerName: string;
  machineName: string;
  machineSerialNumber: string;
  actorName: string | null;
  occurredAt: Date;
  href: string;
  status: string | null;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkDashboard(input: WorkDashboardInput) {
    const scope = input.scope === "mine" ? "mine" : "team";
    const search = input.search?.trim();
    const now = new Date();
    const recentCutoff = this.addDays(now, -14);

    const [tasks, tickets, machineLogs, ticketStatusEvents] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where: this.buildTaskWhere(scope, input.userId, search, recentCutoff),
        include: {
          customer: {
            select: {
              name: true
            }
          },
          machine: {
            select: {
              machineName: true,
              serialNumber: true
            }
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              issueTitle: true
            }
          },
          assignments: {
            include: {
              technician: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: [
          { scheduledStartAt: "asc" },
          { updatedAt: "desc" }
        ],
        take: 150
      }),
      this.prisma.ticket.findMany({
        where: this.buildTicketWhere(scope, input.userId, search, recentCutoff),
        include: {
          machine: {
            include: {
              customer: {
                select: {
                  name: true
                }
              }
            }
          },
          assignedTechnician: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          assignments: {
            where: {
              isActive: true
            },
            include: {
              assignedToUser: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: [
              { isLead: "desc" },
              { createdAt: "asc" }
            ]
          }
        },
        orderBy: [
          { updatedAt: "desc" },
          { createdAt: "desc" }
        ],
        take: 150
      }),
      this.prisma.machineLog.findMany({
        where: this.buildMachineLogActivityWhere(scope, input.userId, search),
        include: {
          machine: {
            include: {
              customer: {
                select: {
                  name: true
                }
              }
            }
          },
          loggedByUser: {
            select: {
              name: true
            }
          }
        },
        orderBy: [
          { createdAt: "desc" },
          { workDate: "desc" }
        ],
        take: 12
      }),
      this.prisma.ticketStatusHistory.findMany({
        where: this.buildTicketStatusActivityWhere(scope, input.userId, search),
        include: {
          changedByUser: {
            select: {
              name: true
            }
          },
          ticket: {
            include: {
              machine: {
                include: {
                  customer: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 12
      })
    ]);

    const items: DashboardItem[] = [
      ...tasks.map((task) => ({
        id: task.id,
        recordType: "TASK" as const,
        title: task.title,
        subtitle: task.ticket ? `${task.ticket.ticketNumber} / ${task.ticket.issueTitle}` : task.taskType.replaceAll("_", " "),
        customerName: task.customer.name,
        machineName: task.machine.machineName,
        machineSerialNumber: task.machine.serialNumber,
        startAt: task.scheduledStartAt,
        dueAt: task.scheduledEndAt ?? task.scheduledStartAt,
        status: task.status,
        priority: task.priority,
        visibility: task.visibility,
        assignedTo: task.assignments.map((assignment) => ({
          id: assignment.technician.id,
          name: assignment.technician.name,
          role: assignment.technician.role
        })),
        href: `/technician/tasks/${task.id}`,
        isOverdue: this.isTaskOverdue(task.status, task.scheduledStartAt, task.scheduledEndAt, now),
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      })),
      ...tickets.map((ticket) => {
        const assignedTo = this.uniqueAssignees([
          ...ticket.assignments.map((assignment) => assignment.assignedToUser),
          ticket.assignedTechnician
        ]);

        return {
          id: ticket.id,
          recordType: "TICKET" as const,
          title: ticket.issueTitle,
          subtitle: ticket.ticketNumber,
          customerName: ticket.machine.customer.name,
          machineName: ticket.machine.machineName,
          machineSerialNumber: ticket.machine.serialNumber,
          startAt: ticket.createdAt,
          dueAt: ticket.updatedAt,
          status: ticket.status,
          priority: ticket.priority,
          assignedTo,
          href: `/technician/tickets/${ticket.id}`,
          isOverdue: this.isTicketPossiblyStale(ticket.status, ticket.updatedAt, now),
          completedAt: ticket.closedAt,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt
        };
      })
    ].sort((a, b) => this.sortItems(a, b, now));

    return {
      data: {
        scope,
        generatedAt: now,
        metrics: this.buildMetrics(items, now),
        items,
        activity: this.buildActivity(machineLogs, ticketStatusEvents)
      }
    };
  }

  private buildActivity(
    machineLogs: Array<Prisma.MachineLogGetPayload<{
      include: {
        machine: {
          include: {
            customer: {
              select: {
                name: true;
              };
            };
          };
        };
        loggedByUser: {
          select: {
            name: true;
          };
        };
      };
    }>>,
    ticketStatusEvents: Array<Prisma.TicketStatusHistoryGetPayload<{
      include: {
        changedByUser: {
          select: {
            name: true;
          };
        };
        ticket: {
          include: {
            machine: {
              include: {
                customer: {
                  select: {
                    name: true;
                  };
                };
              };
            };
          };
        };
      };
    }>>
  ): DashboardActivityItem[] {
    return [
      ...machineLogs.map((log) => ({
        id: log.id,
        activityType: "MACHINE_LOG" as const,
        title: log.title,
        description: `${this.activityTypeLabel(log.activityType)} / ${this.truncate(log.workSummary, 140)}`,
        customerName: log.machine.customer.name,
        machineName: log.machine.machineName,
        machineSerialNumber: log.machine.serialNumber,
        actorName: log.loggedByRequesterName ?? log.loggedByUser?.name ?? log.requesterConfirmedName ?? null,
        occurredAt: log.createdAt,
        href: `/machines/${log.machineId}/logs`,
        status: log.requesterAcknowledgementRequired ? "USER SIGNATURE REQUIRED" : null
      })),
      ...ticketStatusEvents.map((event) => ({
        id: event.id,
        activityType: "TICKET_STATUS" as const,
        title: `${event.ticket.ticketNumber} status changed`,
        description: `${event.fromStatus ?? "Created"} to ${event.toStatus}${event.comment ? ` / ${this.truncate(event.comment, 140)}` : ""}`,
        customerName: event.ticket.machine.customer.name,
        machineName: event.ticket.machine.machineName,
        machineSerialNumber: event.ticket.machine.serialNumber,
        actorName: event.changedByRequesterName ?? event.changedByUser?.name ?? null,
        occurredAt: event.createdAt,
        href: `/technician/tickets/${event.ticketId}`,
        status: event.toStatus
      }))
    ]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 12);
  }

  private buildTaskWhere(scope: "team" | "mine", userId: string, search: string | undefined, recentCutoff: Date) {
    const where: Prisma.TaskWhereInput = {
      OR: [
        { status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] } },
        { completedAt: { gte: recentCutoff } },
        { updatedAt: { gte: recentCutoff } }
      ]
    };

    const andConditions: Prisma.TaskWhereInput[] = [];

    if (scope === "mine") {
      andConditions.push({
        OR: [
          { createdByUserId: userId },
          {
            assignments: {
              some: {
                technicianId: userId
              }
            }
          }
        ]
      });
    } else {
      andConditions.push({
        visibility: TaskVisibility.TEAM
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { machine: { machineName: { contains: search, mode: "insensitive" } } },
          { machine: { serialNumber: { contains: search, mode: "insensitive" } } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
          { ticket: { ticketNumber: { contains: search, mode: "insensitive" } } }
        ]
      });
    }

    if (andConditions.length) where.AND = andConditions;
    return where;
  }

  private buildTicketWhere(scope: "team" | "mine", userId: string, search: string | undefined, recentCutoff: Date) {
    const where: Prisma.TicketWhereInput = {
      OR: [
        { status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
        { closedAt: { gte: recentCutoff } },
        { updatedAt: { gte: recentCutoff } }
      ]
    };

    const andConditions: Prisma.TicketWhereInput[] = [];

    if (scope === "mine") {
      andConditions.push({
        OR: [
          { assignedTechnicianId: userId },
          {
            assignments: {
              some: {
                assignedToUserId: userId,
                isActive: true
              }
            }
          }
        ]
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { ticketNumber: { contains: search, mode: "insensitive" } },
          { issueTitle: { contains: search, mode: "insensitive" } },
          { issueDescription: { contains: search, mode: "insensitive" } },
          { requesterName: { contains: search, mode: "insensitive" } },
          { machine: { machineName: { contains: search, mode: "insensitive" } } },
          { machine: { serialNumber: { contains: search, mode: "insensitive" } } },
          { machine: { customer: { name: { contains: search, mode: "insensitive" } } } }
        ]
      });
    }

    if (andConditions.length) where.AND = andConditions;
    return where;
  }

  private buildMachineLogActivityWhere(scope: "team" | "mine", userId: string, search: string | undefined) {
    const where: Prisma.MachineLogWhereInput = {};
    const andConditions: Prisma.MachineLogWhereInput[] = [];

    if (scope === "mine") {
      andConditions.push({
        OR: [
          { loggedByUserId: userId },
          {
            ticket: {
              OR: [
                { assignedTechnicianId: userId },
                {
                  assignments: {
                    some: {
                      assignedToUserId: userId,
                      isActive: true
                    }
                  }
                }
              ]
            }
          },
          {
            machine: {
              tasks: {
                some: {
                  assignments: {
                    some: {
                      technicianId: userId
                    }
                  }
                }
              }
            }
          }
        ]
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { workSummary: { contains: search, mode: "insensitive" } },
          { machine: { machineName: { contains: search, mode: "insensitive" } } },
          { machine: { serialNumber: { contains: search, mode: "insensitive" } } },
          { machine: { customer: { name: { contains: search, mode: "insensitive" } } } },
          { ticket: { ticketNumber: { contains: search, mode: "insensitive" } } }
        ]
      });
    }

    if (andConditions.length) where.AND = andConditions;
    return where;
  }

  private buildTicketStatusActivityWhere(scope: "team" | "mine", userId: string, search: string | undefined) {
    const where: Prisma.TicketStatusHistoryWhereInput = {};
    const andConditions: Prisma.TicketStatusHistoryWhereInput[] = [];

    if (scope === "mine") {
      andConditions.push({
        ticket: {
          OR: [
            { assignedTechnicianId: userId },
            {
              assignments: {
                some: {
                  assignedToUserId: userId,
                  isActive: true
                }
              }
            }
          ]
        }
      });
    }

    if (search) {
      andConditions.push({
        ticket: {
          OR: [
            { ticketNumber: { contains: search, mode: "insensitive" } },
            { issueTitle: { contains: search, mode: "insensitive" } },
            { issueDescription: { contains: search, mode: "insensitive" } },
            { requesterName: { contains: search, mode: "insensitive" } },
            { machine: { machineName: { contains: search, mode: "insensitive" } } },
            { machine: { serialNumber: { contains: search, mode: "insensitive" } } },
            { machine: { customer: { name: { contains: search, mode: "insensitive" } } } }
          ]
        }
      });
    }

    if (andConditions.length) where.AND = andConditions;
    return where;
  }

  private buildMetrics(items: DashboardItem[], now: Date) {
    const activeStatuses = new Set(["PENDING", "SCHEDULED", "IN_PROGRESS", "WAITING_COMPONENT", "WAITING_CUSTOMER", "NEW", "ASSIGNED", "WAITING_FOR_REQUESTER", "WAITING_FOR_PARTS", "PENDING_ACKNOWLEDGEMENT", "FOLLOW_UP_REQUIRED"]);
    const openItems = items.filter((item) => !this.isTerminalStatus(item.status));

    return {
      total: items.length,
      active: openItems.filter((item) => activeStatuses.has(item.status)).length,
      today: openItems.filter((item) => item.dueAt && this.isSameDay(item.dueAt, now)).length,
      overdue: openItems.filter((item) => item.isOverdue).length,
      completedThisWeek: items.filter((item) => item.completedAt && item.completedAt >= this.addDays(now, -7)).length
    };
  }

  private sortItems(a: DashboardItem, b: DashboardItem, now: Date) {
    const aCompleted = Boolean(a.completedAt);
    const bCompleted = Boolean(b.completedAt);
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

    const priorityDifference = this.priorityRank(a.priority) - this.priorityRank(b.priority);
    if (priorityDifference !== 0) return priorityDifference;

    const aDate = a.dueAt ?? a.startAt ?? a.updatedAt;
    const bDate = b.dueAt ?? b.startAt ?? b.updatedAt;
    const dateDifference = aDate.getTime() - bDate.getTime();
    if (dateDifference !== 0) return dateDifference;

    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.title.localeCompare(b.title);
  }

  private priorityRank(priority: string) {
    const ranks: Record<string, number> = {
      URGENT: 1,
      HIGH: 2,
      NORMAL: 3,
      LOW: 4
    };

    return ranks[priority] ?? 99;
  }

  private isCompletedTaskStatus(status: TaskStatus | string) {
    return status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED;
  }

  private isTaskOverdue(status: TaskStatus | string, startAt: Date | null, endAt: Date | null, now: Date) {
    if (this.isCompletedTaskStatus(status)) return false;
    const dueAt = endAt ?? startAt;
    return dueAt ? dueAt < now : false;
  }

  private isTicketPossiblyStale(status: TicketStatus, updatedAt: Date, now: Date) {
    if (this.isTerminalStatus(status)) return false;
    return updatedAt < this.addDays(now, -3);
  }

  private isTerminalStatus(status: string) {
    return status === TaskStatus.COMPLETED
      || status === TaskStatus.CANCELLED
      || status === TicketStatus.RESOLVED
      || status === TicketStatus.CLOSED
      || status === TicketStatus.CANCELLED;
  }

  private isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private activityTypeLabel(value: string) {
    return value.replaceAll("_", " ");
  }

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
  }

  private uniqueAssignees(users: Array<{ id: string; name: string; role: string } | null>) {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; role: string }> = [];

    for (const user of users) {
      if (!user || seen.has(user.id)) continue;
      seen.add(user.id);
      result.push(user);
    }

    return result;
  }
}
