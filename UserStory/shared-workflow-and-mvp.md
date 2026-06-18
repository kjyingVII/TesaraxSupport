# Shared Workflow and MVP Notes

## Purpose

This document contains shared workflow, data, and MVP notes that apply across requester, technician, admin, and supervisor roles.

## Shared Frontend Requirements

- System must support light theme and dark theme.
- User should be able to select light theme, dark theme, or system preference.
- Theme selection should be remembered on the user's device.
- Requester-facing pages must be mobile phone friendly because requesters will usually scan QR codes from a phone.
- Technician and admin pages should work well on desktop and tablet, with mobile-friendly layouts for quick viewing and updates.
- Forms, upload controls, action buttons, and signature capture must be usable on touch screens.

## High-Level Workflow

1. Admin registers machines in the system.
2. System generates a unique QR code for each machine.
3. QR code is printed and attached to the machine.
4. Requester scans the QR code using a phone.
5. System opens a mobile-friendly request form linked to that machine.
6. Requester fills in contact information, issue description, priority, and optional attachments.
7. System creates a support ticket and notifies the relevant team.
8. Technician logs in and views assigned or open tickets.
9. Technician updates ticket status during diagnosis and repair.
10. Technician completes the job, writes a service report, and uploads attachments.
11. Requester reviews the solution.
12. Requester acknowledges the service, signs digitally, and confirms completion.
13. System stores the completed service record for future reference.
14. Technician or requester can log completed service or upgrade work against the machine.
15. System recalculates the next service due date based on the machine's configured reminder interval.
16. System reminds selected users when service is upcoming, due, or overdue.
17. Admin, supervisor, or technician can view the full machine log timeline containing service logs, upgrade logs, and ticket logs.

## Suggested Ticket Status Flow

1. New
2. Assigned
3. In Progress
4. Waiting for Parts
5. Waiting for Requester
6. Resolved
7. Pending Acknowledgement
8. Closed
9. Follow-Up Required
10. Cancelled

## Suggested Data Entities

### Machine

- Machine ID
- Machine name
- Model
- Serial number
- Customer
- Location
- QR code URL
- Active/inactive status
- Service reminder interval in days
- Last service date
- Next service due date
- Last upgrade date

### Machine Service or Upgrade Log

- Log ID
- Machine ID
- Related ticket ID, if applicable
- Log type: service or upgrade
- Work date
- Work summary
- Parts used
- Upgrade version or upgrade description
- Logged by
- Requester confirmation, if applicable
- Next service due date override
- Created date/time

### Ticket

- Ticket number
- Machine ID
- Requester information
- Issue title
- Issue description
- Issue category
- Priority
- Status
- Assigned technician
- Created date/time
- Updated date/time

### Attachment

- Attachment ID
- Ticket ID
- Uploaded by
- File name
- File type
- File size
- Storage location
- Uploaded date/time

### Service Report

- Report ID
- Ticket ID
- Technician
- Diagnosis
- Action taken
- Parts used
- Recommendation
- Service start date/time
- Service end date/time
- Resolution status

### Acknowledgement

- Acknowledgement ID
- Ticket ID
- Requester name
- Accepted or follow-up requested
- Comment
- Signature image/reference
- Acknowledgement date/time

### User

- User ID
- Name
- Email
- Phone
- Role
- Active/inactive status

## Recommended Build Steps

### Phase 1: Foundation

1. Confirm user roles, ticket statuses, and required fields.
2. Design database schema for machines, tickets, attachments, service reports, acknowledgements, and users.
3. Build authentication for technicians, supervisors, and admins.
4. Build admin machine management.
5. Add service reminder interval to machine records.
6. Generate QR codes for machine records.

### Phase 2: Request Submission

1. Build QR-code-linked public request form.
2. Add requester information and issue detail form.
3. Add requester attachment upload.
4. Create ticket number generation.
5. Add ticket confirmation page and basic notification.

### Phase 3: Technician Workflow

1. Build technician dashboard.
2. Add ticket list, filtering, and search.
3. Add ticket detail page.
4. Add assignment and status update workflow.
5. Add ticket history/audit log.

### Phase 4: Service Report

1. Build technician service report form.
2. Add technician attachment upload.
3. Add status transition to Pending Acknowledgement.
4. Add completed report preview.
5. Add machine service and upgrade logs.
6. Recalculate next service due date after service log completion.

### Phase 5: Requester Acknowledgement

1. Build secure acknowledgement link/page.
2. Show service report and attachments.
3. Add digital signature capture.
4. Add accept and follow-up request actions.
5. Close ticket after successful acknowledgement.

### Phase 6: Reporting and Operations

1. Add machine service history.
2. Add service due, upcoming, and overdue machine views.
3. Add full machine log timeline.
4. Add service reminder notifications.
5. Add PDF export for service report.
6. Add CSV/Excel export for ticket list.
7. Add notification templates.
8. Add admin reports and dashboard metrics.

## Open Questions

1. Should requesters need an account, or should QR submission remain public?
2. Should the QR code be unique per machine only, or also include customer/site information?
3. What attachment file size limit is acceptable?
4. Should notifications be sent by email, SMS, WhatsApp, or another channel?
5. Does the client require offline capability at factory sites with weak internet?
6. Should technicians use mobile phones, tablets, laptops, or all of them?
7. Is a signed PDF service report required for every closed ticket?
8. Are spare parts inventory and quotation approval required in a future phase?
9. Is there an SLA requirement based on priority or customer contract?
10. Are multiple languages required for requesters?
11. Should service reminders notify requester, technician, supervisor, admin, or a configured contact list?
12. Should service reminders automatically create a ticket?
13. How many days before service due date should reminders begin?

## Minimum Viable Product Scope

The first usable version should include:

- Machine registration
- Machine service reminder interval
- QR code generation
- Public ticket submission form
- Requester attachment upload
- Technician login
- Technician ticket dashboard
- Ticket detail view
- Ticket status updates
- Technician service report
- Technician attachment upload
- Machine service and upgrade log
- Full machine log timeline
- Service due date tracking
- Service reminder notification
- Requester acknowledgement page
- Digital signature capture
- Light and dark theme selection
- Mobile-friendly requester flow
- Closed ticket record
