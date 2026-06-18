# Machine Support System - User Stories

## 1. Purpose

Build a support system for machine makers and their clients. A requester scans a QR code on a machine, submits a service ticket with details and attachments, technicians handle the ticket, and the requester acknowledges the completed service with a signature.

## 2. Main Roles

### Requester

The client user who discovers an issue at the machine and submits a support request.

### Technician

The service staff member who logs in, reviews tickets, performs troubleshooting or repair, writes a service report, and uploads supporting attachments.

### Admin / Supervisor

The machine maker's internal user who manages machines, QR codes, users, ticket assignment, status tracking, and reporting.

## 3. High-Level Workflow

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

## 4. User Stories

### Epic 1: Machine QR Code Setup

#### US-001: Register Machine

As an admin, I want to register a machine in the system so that service requests can be linked to a specific machine.

Acceptance criteria:

- Admin can create a machine record with machine name, serial number, model, location, customer, and optional remarks.
- Each machine has a unique machine ID.
- Admin can edit machine details after creation.
- Admin can deactivate a machine without deleting historical tickets.

#### US-002: Generate Machine QR Code

As an admin, I want the system to generate a QR code for each machine so that requesters can quickly open the correct support form.

Acceptance criteria:

- System generates a unique QR code linked to the machine.
- QR code opens a mobile-friendly ticket submission page.
- Admin can download or print the QR code.
- If a machine is deactivated, the QR code page shows an appropriate message.

### Epic 2: Requester Ticket Submission

#### US-003: Open Request Form From QR Code

As a requester, I want to scan the QR code on a machine so that I can report a problem without searching for machine details manually.

Acceptance criteria:

- Scanning the QR code opens the request form in a browser.
- The form displays key machine information, such as machine name, model, serial number, and location.
- The requester does not need to log in to submit a basic request, unless the business later requires authentication.

#### US-004: Submit Requester Information

As a requester, I want to enter my contact information so that the technician can contact me about the service request.

Acceptance criteria:

- Requester can enter name, company, department, phone number, and email.
- Required fields are clearly marked.
- System validates email and phone number format where practical.
- Requester can submit the form from a mobile device.

#### US-005: Submit Issue Details

As a requester, I want to describe the machine issue so that the technician understands what needs to be fixed.

Acceptance criteria:

- Requester can enter issue title and detailed description.
- Requester can select issue category, such as breakdown, abnormal sound, quality issue, preventive maintenance, or other.
- Requester can select priority, such as low, normal, urgent, or machine down.
- System records submission date and time automatically.

#### US-006: Upload Request Attachments

As a requester, I want to upload photos or files so that I can show the machine problem clearly.

Acceptance criteria:

- Requester can upload one or more attachments.
- Supported files include common image formats and PDF.
- System limits file size based on configured rules.
- Attachments are stored with the ticket.

#### US-007: Receive Ticket Confirmation

As a requester, I want to receive confirmation after submission so that I know my request was successfully recorded.

Acceptance criteria:

- System displays a ticket number after submission.
- System can send confirmation by email or SMS if contact details are provided and notification service is enabled.
- Confirmation includes ticket number, machine details, and submitted issue summary.

### Epic 3: Ticket Management

#### US-008: Technician Login

As a technician, I want to log in securely so that only authorized staff can access service tickets.

Acceptance criteria:

- Technician can log in with username/email and password.
- System prevents unauthorized access to the technician dashboard.
- System supports password reset or admin password reset.
- System records last login time where practical.

#### US-009: View Ticket List

As a technician, I want to see support tickets so that I can decide what work needs attention.

Acceptance criteria:

- Technician can view a list of tickets.
- Ticket list shows ticket number, machine, customer, issue title, priority, status, created date, and assigned technician.
- Technician can filter by status, priority, customer, machine, and date.
- Technician can search by ticket number, machine serial number, or requester name.

#### US-010: View Ticket Details

As a technician, I want to open a ticket so that I can review the full request and attachments.

Acceptance criteria:

- Technician can see requester information, machine details, issue details, priority, status, and attachments.
- Technician can open or download requester attachments.
- Ticket history shows major status changes and comments.

#### US-011: Assign Ticket

As an admin or supervisor, I want to assign a ticket to a technician so that responsibility is clear.

Acceptance criteria:

- Admin or supervisor can assign or reassign a ticket.
- Technician can see tickets assigned to them.
- System records assignment changes in ticket history.
- Optional notification is sent to the assigned technician.

#### US-012: Update Ticket Status

As a technician, I want to update ticket status so that everyone knows the current progress.

Acceptance criteria:

- Technician can change status, such as New, Assigned, In Progress, Waiting for Parts, Waiting for Requester, Resolved, Pending Acknowledgement, and Closed.
- System records who changed the status and when.
- Requester can be notified when status changes if notification is enabled.

### Epic 4: Service Report

#### US-013: Write Service Report

As a technician, I want to write a service report after fixing the issue so that the work performed is documented.

Acceptance criteria:

- Technician can enter diagnosis, action taken, parts used, recommendations, and remarks.
- Technician can record service start and end date/time.
- Technician can mark whether the issue is fully resolved.
- Service report is linked to the ticket.

#### US-014: Upload Technician Attachments

As a technician, I want to upload repair photos, test results, or documents so that the completed service has supporting evidence.

Acceptance criteria:

- Technician can upload one or more attachments to the service report.
- Supported files include common image formats and PDF.
- Attachments are visible in the completed ticket record.
- System records uploader and upload date/time.

#### US-015: Submit Ticket for Requester Acknowledgement

As a technician, I want to submit the completed report to the requester so that the requester can confirm the service rendered.

Acceptance criteria:

- Technician can mark the ticket as ready for acknowledgement.
- System changes ticket status to Pending Acknowledgement.
- Requester receives a link to review the service report if notification is enabled.
- The acknowledgement link is tied to the correct ticket and should not expose unrelated tickets.

### Epic 5: Requester Acknowledgement and Signature

#### US-016: Review Completed Service

As a requester, I want to review the technician's report so that I can verify the completed work.

Acceptance criteria:

- Requester can open the acknowledgement page from a secure ticket link.
- Requester can view machine details, original request, technician report, and technician attachments.
- Requester can accept the solution or request follow-up.

#### US-017: Sign and Confirm Service

As a requester, I want to sign digitally and confirm the service rendered so that the ticket can be officially closed.

Acceptance criteria:

- Requester can provide name, acknowledgement date/time, and digital signature.
- Signature can be captured using touch or mouse.
- System prevents confirmation without required acknowledgement information.
- After confirmation, ticket status changes to Closed.
- System stores acknowledgement details with the ticket.

#### US-018: Request Follow-Up

As a requester, I want to reject or request follow-up if the issue is not resolved so that the technician can continue working on the ticket.

Acceptance criteria:

- Requester can select "Request Follow-Up" instead of signing acceptance.
- Requester must provide a reason or comment.
- Ticket status changes back to In Progress or Follow-Up Required.
- Technician and/or supervisor is notified if notification is enabled.

### Epic 6: Administration and Reporting

#### US-019: Manage Users and Roles

As an admin, I want to manage users and roles so that each person has the correct access.

Acceptance criteria:

- Admin can create, edit, deactivate, and reset users.
- Supported roles include admin, supervisor, and technician.
- Role permissions control access to administration, assignment, ticket handling, and reports.

#### US-020: View Service History by Machine

As an admin or technician, I want to view service history by machine so that I can understand recurring issues.

Acceptance criteria:

- System shows all tickets linked to a machine.
- User can filter service history by date, status, issue type, and technician.
- User can open completed service reports from machine history.

#### US-021: Export Ticket or Service Report

As an admin or supervisor, I want to export ticket and service records so that I can share or archive them.

Acceptance criteria:

- System can export an individual service report as PDF.
- Export includes machine details, requester details, issue details, technician report, attachments list, acknowledgement details, and signature.
- System can export ticket lists to CSV or Excel.

### Epic 7: Machine Service, Upgrade Log, and Reminders

#### US-022: Log Machine Service or Upgrade

As a technician, I want to log completed service or upgrade work for a machine so that the machine has a complete maintenance history even when there is no breakdown ticket.

Acceptance criteria:

- Technician can create a machine log with type Service or Upgrade.
- Technician can enter work date, work summary, parts used, recommendations, and optional remarks.
- Technician can link the log to an existing ticket when applicable.
- Technician can upload attachments to the log.
- System updates the machine's last service date when a service log is recorded.
- System recalculates the next service due date using the machine's configured reminder interval.

#### US-023: Log or Confirm Machine Service

As a requester, I want to log or confirm that a service or upgrade was done so that the machine's service history stays accurate.

Acceptance criteria:

- Requester can access service confirmation from a secure link or allowed QR flow.
- Requester can confirm completed service or upgrade details.
- Requester can provide name, date, remarks, and optional attachment.
- System records requester confirmation in the machine service history.
- If the log is a service, system updates the machine's service reminder schedule.

#### US-024: Configure Machine Service Reminder

As an admin or supervisor, I want to configure the service reminder interval for each machine so that the system can remind users when service is due.

Acceptance criteria:

- Admin or supervisor can set a service reminder interval in days for each machine.
- System supports different intervals for different machines, such as 90 days or 120 days.
- System calculates next service due date from last service date plus reminder interval.
- Admin or supervisor can manually override the next service due date.
- System shows upcoming, due, and overdue service status.
- System can notify the selected users when service is upcoming, due, or overdue.

#### US-025: View Full Machine Log

As an admin, supervisor, or technician, I want to view a full machine log so that I can see service logs, upgrade logs, and support ticket history in one place.

Acceptance criteria:

- System shows service logs, upgrade logs, and ticket logs for the selected machine.
- Timeline can be sorted newest first.
- User can filter by Service, Upgrade, or Ticket.
- User can search by ticket number, work summary, issue title, requester, or technician.
- User can open the original service log, upgrade log, or ticket detail.

## 5. Suggested Ticket Status Flow

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

## 6. Suggested Data Entities

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

## 7. Recommended Build Steps

### Phase 1: Foundation

1. Confirm user roles, ticket statuses, and required fields.
2. Design database schema for machines, tickets, attachments, service reports, acknowledgements, and users.
3. Build authentication for technicians, supervisors, and admins.
4. Build admin machine management.
5. Generate QR codes for machine records.

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

### Phase 5: Requester Acknowledgement

1. Build secure acknowledgement link/page.
2. Show service report and attachments.
3. Add digital signature capture.
4. Add accept and follow-up request actions.
5. Close ticket after successful acknowledgement.

### Phase 6: Reporting and Operations

1. Add machine service history.
2. Add PDF export for service report.
3. Add CSV/Excel export for ticket list.
4. Add notification templates.
5. Add admin reports and dashboard metrics.

## 8. Open Questions

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

## 9. Minimum Viable Product Scope

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
- Closed ticket record
