CREATE INDEX IF NOT EXISTS "User_role_isActive_createdAt_idx" ON "User"("role", "isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "Customer_isActive_createdAt_idx" ON "Customer"("isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "Machine_customerId_createdAt_idx" ON "Machine"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Machine_isActive_createdAt_idx" ON "Machine"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "Machine_isActive_nextServiceDueAt_idx" ON "Machine"("isActive", "nextServiceDueAt");

CREATE INDEX IF NOT EXISTS "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");
CREATE INDEX IF NOT EXISTS "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_machineId_createdAt_idx" ON "Ticket"("machineId", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_assignedTechnicianId_createdAt_idx" ON "Ticket"("assignedTechnicianId", "createdAt");
CREATE INDEX IF NOT EXISTS "Ticket_priority_createdAt_idx" ON "Ticket"("priority", "createdAt");

CREATE INDEX IF NOT EXISTS "TicketStatusHistory_ticketId_createdAt_idx" ON "TicketStatusHistory"("ticketId", "createdAt");

CREATE INDEX IF NOT EXISTS "TicketComment_ticketId_createdAt_idx" ON "TicketComment"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "TicketComment_ticketId_visibility_createdAt_idx" ON "TicketComment"("ticketId", "visibility", "createdAt");

CREATE INDEX IF NOT EXISTS "TicketAssignment_ticketId_isActive_idx" ON "TicketAssignment"("ticketId", "isActive");
CREATE INDEX IF NOT EXISTS "TicketAssignment_assignedToUserId_isActive_idx" ON "TicketAssignment"("assignedToUserId", "isActive");
CREATE INDEX IF NOT EXISTS "TicketAssignment_isActive_isLead_idx" ON "TicketAssignment"("isActive", "isLead");

CREATE INDEX IF NOT EXISTS "ServiceReport_ticketId_createdAt_idx" ON "ServiceReport"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "ServiceReport_technicianId_createdAt_idx" ON "ServiceReport"("technicianId", "createdAt");

CREATE INDEX IF NOT EXISTS "MachineLog_title_idx" ON "MachineLog"("title");
CREATE INDEX IF NOT EXISTS "MachineLog_notifyCustomer_idx" ON "MachineLog"("notifyCustomer");
CREATE INDEX IF NOT EXISTS "MachineLog_machineId_workDate_idx" ON "MachineLog"("machineId", "workDate");
CREATE INDEX IF NOT EXISTS "MachineLog_machineId_activityType_workDate_idx" ON "MachineLog"("machineId", "activityType", "workDate");
CREATE INDEX IF NOT EXISTS "MachineLog_ticketId_workDate_idx" ON "MachineLog"("ticketId", "workDate");
CREATE INDEX IF NOT EXISTS "MachineLog_serviceReportId_workDate_idx" ON "MachineLog"("serviceReportId", "workDate");

CREATE INDEX IF NOT EXISTS "Acknowledgement_ticketId_createdAt_idx" ON "Acknowledgement"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "Acknowledgement_response_createdAt_idx" ON "Acknowledgement"("response", "createdAt");

CREATE INDEX IF NOT EXISTS "Attachment_ticketId_createdAt_idx" ON "Attachment"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "Attachment_ticketCommentId_createdAt_idx" ON "Attachment"("ticketCommentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Attachment_serviceReportId_createdAt_idx" ON "Attachment"("serviceReportId", "createdAt");
CREATE INDEX IF NOT EXISTS "Attachment_machineLogId_createdAt_idx" ON "Attachment"("machineLogId", "createdAt");
CREATE INDEX IF NOT EXISTS "Attachment_machineId_relatedType_createdAt_idx" ON "Attachment"("machineId", "relatedType", "createdAt");

CREATE INDEX IF NOT EXISTS "ServiceReminderLog_machineId_dueDate_idx" ON "ServiceReminderLog"("machineId", "dueDate");
CREATE INDEX IF NOT EXISTS "ServiceReminderLog_status_dueDate_idx" ON "ServiceReminderLog"("status", "dueDate");

CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

CREATE INDEX IF NOT EXISTS "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_channel_status_createdAt_idx" ON "NotificationLog"("channel", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_relatedType_relatedId_createdAt_idx" ON "NotificationLog"("relatedType", "relatedId", "createdAt");
