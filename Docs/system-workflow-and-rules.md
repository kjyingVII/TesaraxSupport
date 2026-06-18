# System Workflow and Rules

## Purpose

This document defines the core workflow and business rules for the machine support system. It will guide the database schema, API design, and screen development.

## User Roles

### Requester

Client-side user who scans the machine QR code and submits a service request.

Permissions:

- Open public request form from machine QR code.
- Submit requester contact information.
- Submit issue details.
- Upload request attachments.
- Log completed service or upgrade information when allowed by business rules.
- Review completed service report from secure acknowledgement link.
- Accept service and sign digitally.
- Request follow-up if the issue is not resolved.

### Technician

Internal service user who handles support tickets.

Permissions:

- Log in to technician dashboard.
- View assigned tickets.
- View open tickets if allowed by supervisor/admin rules.
- View requester details and attachments.
- Update ticket status.
- Write service report.
- Upload technician attachments.
- Log machine service or upgrade work.
- Submit ticket for requester acknowledgement.
- View machine service history.

### Supervisor

Internal user who oversees technician work and ticket progress.

Permissions:

- View all tickets.
- Assign and reassign tickets.
- Monitor ticket progress.
- View service reports.
- Export ticket and service report records.
- View machine service history.
- Configure service reminder rules for machines.

### Admin

Internal user with full system management responsibility.

Permissions:

- Manage machines.
- Configure machine service reminder intervals.
- Generate and download QR codes.
- Manage users and roles.
- View all tickets.
- Assign and reassign tickets.
- Manage system configuration.
- Export records.

## Ticket Statuses

Suggested statuses:

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

## Status Transition Rules

### New

Created after requester submits a ticket.

Allowed next statuses:

- Assigned
- Cancelled

### Assigned

Ticket has been assigned to a technician.

Allowed next statuses:

- In Progress
- Cancelled

### In Progress

Technician is diagnosing or fixing the issue.

Allowed next statuses:

- Waiting for Parts
- Waiting for Requester
- Resolved
- Cancelled

### Waiting for Parts

Work is paused because parts are required.

Allowed next statuses:

- In Progress
- Cancelled

### Waiting for Requester

Work is paused because technician needs requester information or site access.

Allowed next statuses:

- In Progress
- Cancelled

### Resolved

Technician has completed the work but has not yet sent it for requester acknowledgement.

Allowed next statuses:

- Pending Acknowledgement
- In Progress

### Pending Acknowledgement

Technician submitted the completed service report to the requester.

Allowed next statuses:

- Closed
- Follow-Up Required

### Closed

Requester accepted the solution and signed acknowledgement.

Allowed next statuses:

- None by default.

### Follow-Up Required

Requester did not accept the solution and requested further action.

Allowed next statuses:

- In Progress
- Cancelled

### Cancelled

Ticket was cancelled before completion.

Allowed next statuses:

- None by default.

## Public Access Rules

- Requesters do not need an account for MVP ticket submission.
- Machine QR code must use a random public machine identifier, not a sequential database ID.
- Public request page should only expose basic machine information needed to confirm the correct machine.
- Acknowledgement page must use a secure random token.
- Acknowledgement token should be scoped to one ticket.
- Acknowledgement token should expire after a configured period.

## Required Fields

### Machine

Required:

- Machine name
- Model
- Serial number
- Customer
- Location
- Service reminder interval in days

Optional:

- Internal remarks
- Installation date
- Warranty expiry date
- Last service date
- Next service due date
- Last upgrade date

### Machine Service or Upgrade Log

Required:

- Machine
- Log type: service or upgrade
- Work date
- Logged by
- Work summary

Optional:

- Related ticket
- Service report
- Parts used
- Upgrade version or upgrade description
- Next service due date override
- Attachments
- Requester acknowledgement

### Ticket Submission

Required:

- Requester name
- Phone number or email
- Issue title
- Issue description
- Issue category
- Priority

Optional:

- Company
- Department
- Attachments

### Service Report

Required:

- Diagnosis
- Action taken
- Resolution status
- Service start date/time
- Service end date/time

Optional:

- Parts used
- Recommendations
- Technician remarks
- Technician attachments

### Acknowledgement

Required when accepted:

- Requester name
- Digital signature
- Acknowledgement date/time

Required when follow-up requested:

- Requester name
- Follow-up reason/comment

## Machine Service and Upgrade Log Rules

- Machine history should include both issue tickets and planned service/upgrade logs.
- A service or upgrade log may be linked to a ticket, but it can also exist without a ticket for planned maintenance.
- Technician can create a service or upgrade log after work is completed.
- Requester can log or confirm service/upgrade completion only when allowed by business rules.
- Each machine can have its own service reminder interval, such as 90 days, 120 days, or another configured value.
- System should calculate next service due date from the last completed service date plus the machine's reminder interval.
- Admin or supervisor can override the next service due date when needed.
- System should show service due, overdue, and upcoming service status on machine records.
- System should support reminders before service due date.

Suggested reminder timing:

- Upcoming service reminder: configurable number of days before due date.
- Due reminder: on the due date.
- Overdue reminder: recurring reminder after due date until service is logged or reminder is dismissed.

## Attachment Rules

- Requester and technician can upload attachments.
- Supported file types for MVP: JPG, PNG, PDF.
- File size limit should be configurable.
- Attachments should be stored in S3-compatible object storage.
- Database should store attachment metadata and storage key.
- Attachments should be linked to ticket, service report, or acknowledgement as appropriate.

## Theme and Device Rules

- Frontend must support light theme and dark theme.
- User can select light theme, dark theme, or system preference.
- Theme selection should be remembered on the user's device.
- Requester pages must be mobile phone friendly.
- Signature capture must work with touch and mouse.
- Technician and admin pages should support desktop and tablet layouts, with usable mobile layouts for quick checks.

## MVP Scope

Included in MVP:

- Machine registration
- Machine service reminder interval
- QR code generation
- Public ticket submission form
- Requester attachment upload
- Technician/admin login
- Technician ticket dashboard
- Ticket detail page
- Ticket status updates
- Ticket assignment
- Service report form
- Technician attachment upload
- Machine service and upgrade log
- Service due date tracking
- Requester acknowledgement page
- Digital signature capture
- Closed ticket record

Out of MVP unless confirmed:

- Spare parts inventory
- Quotation approval
- SLA automation
- WhatsApp/SMS integration
- Offline mode
- Multi-language support
- Mobile native app

## Open Decisions

1. Should requesters receive confirmation by email, SMS, or both?
2. What maximum attachment size should be allowed?
3. How long should acknowledgement links remain valid?
4. Should technicians see all open tickets or only assigned tickets?
5. Should closed tickets ever be reopened?
6. Should service report PDF be generated automatically after acknowledgement?
7. Should service reminders notify requester, admin/supervisor, technician, or all of them?
8. How many days before service due date should the system send the first reminder?
9. Should a service reminder automatically create a ticket, or only send a reminder?
