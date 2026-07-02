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
  High = "HIGH",
  Urgent = "URGENT",
}

export enum MachineActivityType {
  CorrectiveService = "CORRECTIVE_SERVICE",
  MachineMaintenance = "MACHINE_MAINTENANCE",
  ComponentReplacement = "COMPONENT_REPLACEMENT",
  InspectionDiagnosis = "INSPECTION_DIAGNOSIS",
  Upgrade = "UPGRADE",
  Other = "OTHER"
}

export enum TimelineItemType {
  MachineLog = "MACHINE_LOG",
  Ticket = "TICKET"
}

export type MachineTimelineItem = {
  type: TimelineItemType;
  eventDate: string;
  title: string;
  summary: string;
  activityType?: MachineActivityType | null;
  status?: string | null;
  relatedId: string;
  relatedNumber?: string | null;
  attachmentCount: number;
  actorName?: string | null;
};
