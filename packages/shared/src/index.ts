export enum UserRole {
  Admin = "ADMIN",
  Supervisor = "SUPERVISOR",
  Technician = "TECHNICIAN"
}

export enum TicketStatus {
  New = "NEW",
  Assigned = "ASSIGNED",
  InProgress = "IN_PROGRESS",
  WaitingForParts = "WAITING_FOR_PARTS",
  WaitingForRequester = "WAITING_FOR_REQUESTER",
  Resolved = "RESOLVED",
  PendingAcknowledgement = "PENDING_ACKNOWLEDGEMENT",
  Closed = "CLOSED",
  FollowUpRequired = "FOLLOW_UP_REQUIRED",
  Cancelled = "CANCELLED"
}

export enum TicketPriority {
  Low = "LOW",
  Normal = "NORMAL",
  Urgent = "URGENT",
  MachineDown = "MACHINE_DOWN"
}

export enum MachineLogType {
  Service = "SERVICE",
  Upgrade = "UPGRADE"
}

export enum TimelineItemType {
  Service = "SERVICE",
  Upgrade = "UPGRADE",
  Ticket = "TICKET"
}

export type MachineTimelineItem = {
  type: TimelineItemType;
  eventDate: string;
  title: string;
  summary: string;
  status?: string | null;
  relatedId: string;
  relatedNumber?: string | null;
  attachmentCount: number;
  actorName?: string | null;
};

