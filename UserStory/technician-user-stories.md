# Technician User Stories

## Role

The technician is the service staff member who logs in, reviews tickets, performs troubleshooting or repair, writes a service report, and uploads supporting attachments.

## Main Goals

- Log in securely.
- View assigned or open tickets.
- Review request details and attachments.
- Update ticket status.
- Write service reports.
- Log completed machine service or upgrade work.
- Upload repair photos, test results, or documents.
- Submit completed service for requester acknowledgement.
- View service history by machine when troubleshooting recurring issues.
- View full machine log including service, upgrade, and ticket history.

## User Stories

### US-008: Technician Login

As a technician, I want to log in securely so that only authorized staff can access service tickets.

Acceptance criteria:

- Technician can log in with username/email and password.
- System prevents unauthorized access to the technician dashboard.
- System supports password reset or admin password reset.
- System records last login time where practical.

### US-009: View Ticket List

As a technician, I want to see support tickets so that I can decide what work needs attention.

Acceptance criteria:

- Technician can view a list of tickets.
- Ticket list shows ticket number, machine, customer, issue title, priority, status, created date, and assigned technician.
- Technician can filter by status, priority, customer, machine, and date.
- Technician can search by ticket number, machine serial number, or requester name.

### US-010: View Ticket Details

As a technician, I want to open a ticket so that I can review the full request and attachments.

Acceptance criteria:

- Technician can see requester information, machine details, issue details, priority, status, and attachments.
- Technician can open or download requester attachments.
- Ticket history shows major status changes and comments.

### US-012: Update Ticket Status

As a technician, I want to update ticket status so that everyone knows the current progress.

Acceptance criteria:

- Technician can change status, such as New, Assigned, In Progress, Waiting for Parts, Waiting for Requester, Resolved, Pending Acknowledgement, and Closed.
- System records who changed the status and when.
- Requester can be notified when status changes if notification is enabled.

### US-013: Write Service Report

As a technician, I want to write a service report after fixing the issue so that the work performed is documented.

Acceptance criteria:

- Technician can enter diagnosis, action taken, parts used, recommendations, and remarks.
- Technician can record service start and end date/time.
- Technician can mark whether the issue is fully resolved.
- Service report is linked to the ticket.

### US-014: Upload Technician Attachments

As a technician, I want to upload repair photos, test results, or documents so that the completed service has supporting evidence.

Acceptance criteria:

- Technician can upload one or more attachments to the service report.
- Supported files include common image formats and PDF.
- Attachments are visible in the completed ticket record.
- System records uploader and upload date/time.

### US-015: Submit Ticket for Requester Acknowledgement

As a technician, I want to submit the completed report to the requester so that the requester can confirm the service rendered.

Acceptance criteria:

- Technician can mark the ticket as ready for acknowledgement.
- System changes ticket status to Pending Acknowledgement.
- Requester receives a link to review the service report if notification is enabled.
- The acknowledgement link is tied to the correct ticket and should not expose unrelated tickets.

### US-020: View Service History by Machine

As an admin or technician, I want to view service history by machine so that I can understand recurring issues.

Acceptance criteria:

- System shows all tickets linked to a machine.
- System shows service logs and upgrade logs linked to a machine.
- System can show service logs, upgrade logs, and ticket logs together in one timeline.
- User can filter service history by date, status, issue type, and technician.
- User can open completed service reports from machine history.

### US-025: View Full Machine Log

As a technician, I want to view a full machine log so that I can understand the machine's service, upgrade, and ticket history before troubleshooting.

Acceptance criteria:

- System shows service logs, upgrade logs, and ticket logs for the selected machine.
- Timeline can be sorted newest first.
- Technician can filter by Service, Upgrade, or Ticket.
- Technician can search by ticket number, work summary, issue title, requester, or technician.
- Technician can open the original service log, upgrade log, or ticket detail.

### US-022: Log Machine Service or Upgrade

As a technician, I want to log completed service or upgrade work for a machine so that the machine has a complete maintenance history even when there is no breakdown ticket.

Acceptance criteria:

- Technician can create a machine log with type Service or Upgrade.
- Technician can enter work date, work summary, parts used, recommendations, and optional remarks.
- Technician can link the log to an existing ticket when applicable.
- Technician can upload attachments to the log.
- System updates the machine's last service date when a service log is recorded.
- System recalculates the next service due date using the machine's configured reminder interval.
