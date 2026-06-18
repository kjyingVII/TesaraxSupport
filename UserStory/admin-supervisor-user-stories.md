# Admin and Supervisor User Stories

## Role

The admin or supervisor is the machine maker's internal user who manages machines, QR codes, users, ticket assignment, status tracking, and reporting.

## Main Goals

- Register and maintain machines.
- Generate machine QR codes.
- Configure service reminder intervals for each machine.
- Manage internal users and roles.
- Assign or reassign tickets to technicians.
- Monitor ticket progress.
- View service history by machine.
- View full machine log including service, upgrade, and ticket history.
- Export tickets and service reports.

## User Stories

### US-001: Register Machine

As an admin, I want to register a machine in the system so that service requests can be linked to a specific machine.

Acceptance criteria:

- Admin can create a machine record with machine name, serial number, model, location, customer, and optional remarks.
- Each machine has a unique machine ID.
- Admin can set service reminder interval, such as 90 days or 120 days, for each machine.
- Admin can edit machine details after creation.
- Admin can deactivate a machine without deleting historical tickets.

### US-002: Generate Machine QR Code

As an admin, I want the system to generate a QR code for each machine so that requesters can quickly open the correct support form.

Acceptance criteria:

- System generates a unique QR code linked to the machine.
- QR code opens a mobile-friendly ticket submission page.
- Admin can download or print the QR code.
- If a machine is deactivated, the QR code page shows an appropriate message.

### US-011: Assign Ticket

As an admin or supervisor, I want to assign a ticket to a technician so that responsibility is clear.

Acceptance criteria:

- Admin or supervisor can assign or reassign a ticket.
- Technician can see tickets assigned to them.
- System records assignment changes in ticket history.
- Optional notification is sent to the assigned technician.

### US-019: Manage Users and Roles

As an admin, I want to manage users and roles so that each person has the correct access.

Acceptance criteria:

- Admin can create, edit, deactivate, and reset users.
- Supported roles include admin, supervisor, and technician.
- Role permissions control access to administration, assignment, ticket handling, and reports.

### US-020: View Service History by Machine

As an admin or technician, I want to view service history by machine so that I can understand recurring issues.

Acceptance criteria:

- System shows all tickets linked to a machine.
- System shows service logs and upgrade logs linked to a machine.
- System can show service logs, upgrade logs, and ticket logs together in one timeline.
- User can filter service history by date, status, issue type, and technician.
- User can open completed service reports from machine history.

### US-025: View Full Machine Log

As an admin or supervisor, I want to view a full machine log so that I can see the complete history of service, upgrades, and support tickets in one place.

Acceptance criteria:

- System shows service logs, upgrade logs, and ticket logs for the selected machine.
- Timeline can be sorted newest first.
- User can filter by Service, Upgrade, or Ticket.
- User can search by ticket number, work summary, issue title, requester, or technician.
- User can open the original service log, upgrade log, or ticket detail.

### US-024: Configure Machine Service Reminder

As an admin or supervisor, I want to configure the service reminder interval for each machine so that the system can remind users when service is due.

Acceptance criteria:

- Admin or supervisor can set a service reminder interval in days for each machine.
- System supports different intervals for different machines, such as 90 days or 120 days.
- System calculates next service due date from last service date plus reminder interval.
- Admin or supervisor can manually override the next service due date.
- System shows upcoming, due, and overdue service status.
- System can notify the selected users when service is upcoming, due, or overdue.

### US-021: Export Ticket or Service Report

As an admin or supervisor, I want to export ticket and service records so that I can share or archive them.

Acceptance criteria:

- System can export an individual service report as PDF.
- Export includes machine details, requester details, issue details, technician report, attachments list, acknowledgement details, and signature.
- System can export ticket lists to CSV or Excel.
