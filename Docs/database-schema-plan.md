# Database Schema Plan

## Purpose

This document defines the first database design for the machine support system. It is written as a planning document before creating the actual Prisma schema.

## Database Choice

Use PostgreSQL.

Reasons:

- The system has strongly related data: customers, machines, tickets, reports, attachments, acknowledgements, and service logs.
- Reporting and filtering are important.
- Audit history and service history should remain reliable over time.
- PostgreSQL works well with Prisma and NestJS.

## Design Principles

- Use UUID primary keys for main records.
- Use random public IDs/tokens for requester-facing links.
- Do not expose sequential database IDs in public URLs.
- Store uploaded files in object storage, not directly in the database.
- Store file metadata and storage keys in the database.
- Use soft deletion or active/inactive flags for important master data.
- Keep audit and history tables append-only where practical.

## Core Tables

### users

Internal users who log in to the system.

Examples:

- Admin
- Supervisor
- Technician

Important fields:

- id
- name
- email
- phone
- password_hash
- role
- is_active
- last_login_at
- created_at
- updated_at

Relationships:

- One user can be assigned many tickets.
- One user can create many service reports.
- One user can create many machine logs.
- One user can create many audit log entries.

### customers

Client companies or sites that own/use machines.

Important fields:

- id
- name
- contact_name
- contact_email
- contact_phone
- address
- remarks
- is_active
- created_at
- updated_at

Relationships:

- One customer has many machines.
- One customer has many tickets through machines.

### machines

Machine master record.

Important fields:

- id
- public_id
- customer_id
- machine_name
- model
- serial_number
- location
- qr_code_url
- service_reminder_interval_days
- last_service_at
- next_service_due_at
- last_upgrade_at
- installation_date
- warranty_expiry_date
- internal_remarks
- is_active
- created_at
- updated_at

Relationships:

- One machine belongs to one customer.
- One machine has many tickets.
- One machine has many machine logs.
- One machine has many service reminder logs.

Notes:

- `public_id` should be random and used in QR code URLs.
- `serial_number` should be unique per customer, or globally unique if your machines always have unique serial numbers.
- `service_reminder_interval_days` allows each machine to use a different interval, such as 90 or 120 days.

### Machine Full Log Page Data

The full machine log page does not need a separate table for MVP.

It should be built by combining records from:

- `machine_logs` where `log_type` is SERVICE
- `machine_logs` where `log_type` is UPGRADE
- `tickets` linked by `machine_id`

The backend can expose a timeline endpoint that merges these records into one sorted response.

Suggested endpoint:

```text
GET /api/machines/:id/timeline
```

Suggested response fields:

- timeline item type: SERVICE, UPGRADE, or TICKET
- event date
- title
- summary
- status, if applicable
- related record ID
- attachment count
- created by / logged by

The page should support:

- Sort newest first
- Filter by service, upgrade, or ticket
- Search by title, summary, ticket number, or technician/requester name
- Open the original service log, upgrade log, or ticket detail

### machine_logs

History records for service and upgrade work done on a machine.

This table supports both planned maintenance and work linked to a support ticket.

Important fields:

- id
- machine_id
- ticket_id
- service_report_id
- log_type
- work_date
- work_summary
- parts_used
- upgrade_version
- upgrade_description
- next_service_due_override_at
- requester_confirmed_name
- requester_confirmed_at
- logged_by_user_id
- logged_by_requester_name
- created_at
- updated_at

Relationships:

- One machine log belongs to one machine.
- One machine log may belong to one ticket.
- One machine log may belong to one service report.
- One machine log may be created by one internal user.
- One machine log can have many attachments.

Suggested `log_type` values:

- SERVICE
- UPGRADE

Notes:

- If `log_type` is SERVICE, the system should update `machines.last_service_at`.
- If `log_type` is SERVICE, the system should recalculate `machines.next_service_due_at`.
- If `log_type` is UPGRADE, the system should update `machines.last_upgrade_at`.

### service_reminder_logs

Records reminder events sent or generated for machine service due dates.

Important fields:

- id
- machine_id
- reminder_type
- due_date
- sent_to_name
- sent_to_email
- sent_to_phone
- channel
- status
- sent_at
- error_message
- created_at

Relationships:

- One reminder log belongs to one machine.

Suggested `reminder_type` values:

- UPCOMING
- DUE
- OVERDUE

Suggested `channel` values:

- EMAIL
- SMS
- WHATSAPP
- SYSTEM

Suggested `status` values:

- PENDING
- SENT
- FAILED
- SKIPPED

### tickets

Support request created from QR code or internal user.

Important fields:

- id
- ticket_number
- machine_id
- requester_name
- requester_company
- requester_department
- requester_phone
- requester_email
- issue_title
- issue_description
- issue_category
- priority
- status
- assigned_technician_id
- created_from_public_qr
- created_at
- updated_at
- closed_at

Relationships:

- One ticket belongs to one machine.
- One ticket may be assigned to one technician.
- One ticket has many attachments.
- One ticket has many status history records.
- One ticket may have one or more service reports.
- One ticket may have one acknowledgement.
- One ticket may have many machine logs.

Suggested `priority` values:

- LOW
- NORMAL
- URGENT
- MACHINE_DOWN

Suggested `status` values:

- NEW
- ASSIGNED
- IN_PROGRESS
- WAITING_FOR_PARTS
- WAITING_FOR_REQUESTER
- RESOLVED
- PENDING_ACKNOWLEDGEMENT
- CLOSED
- FOLLOW_UP_REQUIRED
- CANCELLED

### ticket_status_history

Append-only history of ticket status changes.

Important fields:

- id
- ticket_id
- from_status
- to_status
- changed_by_user_id
- changed_by_requester_name
- comment
- created_at

Relationships:

- One status history record belongs to one ticket.
- One status history record may be created by one internal user.

### ticket_comments

Internal or requester-visible comments on tickets.

Important fields:

- id
- ticket_id
- comment
- visibility
- created_by_user_id
- created_by_requester_name
- created_at

Suggested `visibility` values:

- INTERNAL
- REQUESTER_VISIBLE

### ticket_assignments

History of ticket assignment changes.

Important fields:

- id
- ticket_id
- assigned_to_user_id
- assigned_by_user_id
- comment
- created_at

Relationships:

- One assignment record belongs to one ticket.
- One assignment record points to assigned technician.
- One assignment record points to assigning admin/supervisor.

### service_reports

Technician report after completing work.

Important fields:

- id
- ticket_id
- technician_id
- diagnosis
- action_taken
- parts_used
- recommendations
- technician_remarks
- service_start_at
- service_end_at
- resolution_status
- submitted_for_acknowledgement_at
- created_at
- updated_at

Relationships:

- One service report belongs to one ticket.
- One service report belongs to one technician.
- One service report can have many attachments.
- One service report may be linked to one or more machine logs.

Suggested `resolution_status` values:

- RESOLVED
- PARTIALLY_RESOLVED
- NOT_RESOLVED

### acknowledgements

Requester acceptance or follow-up response.

Important fields:

- id
- ticket_id
- acknowledgement_token_hash
- token_expires_at
- response
- requester_name
- requester_comment
- signature_attachment_id
- acknowledged_at
- created_at
- updated_at

Relationships:

- One acknowledgement belongs to one ticket.
- One acknowledgement may point to one signature attachment.

Suggested `response` values:

- ACCEPTED
- FOLLOW_UP_REQUESTED

Notes:

- Store token hash, not raw token, if possible.
- The public link should include the raw token, but database stores only the hash.

### attachments

Metadata for uploaded files stored in object storage.

Important fields:

- id
- related_type
- related_id
- uploaded_by_user_id
- uploaded_by_requester_name
- original_file_name
- content_type
- file_size_bytes
- storage_bucket
- storage_key
- checksum
- created_at

Suggested `related_type` values:

- TICKET
- SERVICE_REPORT
- MACHINE_LOG
- ACKNOWLEDGEMENT_SIGNATURE

Relationships:

- Attachment may belong to a ticket, service report, machine log, or acknowledgement signature.

Notes:

- A polymorphic relationship is flexible, but Prisma does not model polymorphic foreign keys directly.
- Alternative: use nullable foreign keys such as `ticket_id`, `service_report_id`, `machine_log_id`, and `acknowledgement_id`.
- For the first Prisma schema, nullable foreign keys may be easier and safer.

### audit_logs

System-level audit trail for important actions.

Important fields:

- id
- actor_user_id
- actor_requester_name
- action
- entity_type
- entity_id
- before_data
- after_data
- ip_address
- user_agent
- created_at

Examples of audited actions:

- User login
- Machine created or updated
- Ticket created
- Ticket assigned
- Ticket status changed
- Service report submitted
- Acknowledgement accepted
- Machine service reminder interval changed

### notification_logs

History of notifications sent by the system.

Important fields:

- id
- related_type
- related_id
- channel
- recipient_name
- recipient_email
- recipient_phone
- subject
- message_summary
- status
- provider_message_id
- error_message
- sent_at
- created_at

Suggested `channel` values:

- EMAIL
- SMS
- WHATSAPP
- SYSTEM

Suggested `status` values:

- PENDING
- SENT
- FAILED
- SKIPPED

## Suggested Enums

### UserRole

- ADMIN
- SUPERVISOR
- TECHNICIAN

### TicketStatus

- NEW
- ASSIGNED
- IN_PROGRESS
- WAITING_FOR_PARTS
- WAITING_FOR_REQUESTER
- RESOLVED
- PENDING_ACKNOWLEDGEMENT
- CLOSED
- FOLLOW_UP_REQUIRED
- CANCELLED

### TicketPriority

- LOW
- NORMAL
- URGENT
- MACHINE_DOWN

### MachineLogType

- SERVICE
- UPGRADE

### ReminderType

- UPCOMING
- DUE
- OVERDUE

### NotificationChannel

- EMAIL
- SMS
- WHATSAPP
- SYSTEM

### NotificationStatus

- PENDING
- SENT
- FAILED
- SKIPPED

### AcknowledgementResponse

- ACCEPTED
- FOLLOW_UP_REQUESTED

### AttachmentRelatedType

- TICKET
- SERVICE_REPORT
- MACHINE_LOG
- ACKNOWLEDGEMENT_SIGNATURE

## Important Indexes

Suggested indexes:

- users.email
- machines.public_id
- machines.customer_id
- machines.serial_number
- machines.next_service_due_at
- machine_logs.machine_id
- machine_logs.log_type
- machine_logs.work_date
- service_reminder_logs.machine_id
- service_reminder_logs.due_date
- tickets.ticket_number
- tickets.machine_id
- tickets.status
- tickets.priority
- tickets.assigned_technician_id
- tickets.created_at
- ticket_status_history.ticket_id
- service_reports.ticket_id
- acknowledgements.ticket_id
- attachments.ticket_id, if nullable FK approach is used
- attachments.service_report_id, if nullable FK approach is used
- attachments.machine_log_id, if nullable FK approach is used
- audit_logs.entity_type and audit_logs.entity_id

## First Prisma Schema Direction

For the first implementation, prefer explicit nullable foreign keys for attachments:

- ticket_id
- service_report_id
- machine_log_id
- acknowledgement_id

This is less abstract than a polymorphic relation, but it gives stronger database relationships and easier Prisma usage.

## Open Schema Decisions

1. Should `serial_number` be globally unique, or only unique per customer?
2. Should a ticket allow multiple service reports, or exactly one final service report?
3. Should requesters be stored as accounts later, or remain as ticket contact fields?
4. Should service reminders automatically create tickets?
5. Should acknowledgement tokens expire after 7 days, 14 days, 30 days, or another duration?
6. Should service reminder interval be required for every machine, or optional?
7. Should machine logs require requester confirmation, or only when sent for acknowledgement?
