# API Contract Plan

## Purpose

This document defines the first REST API contract for the machine support system. It is a planning document before implementing the NestJS backend and Next.js frontend.

## API Style

- Use REST API first.
- Use JSON request and response bodies.
- Use `/api` prefix for backend routes.
- Use UUIDs for internal resource IDs.
- Use random public IDs or tokens for public requester routes.
- Use pagination for list endpoints.
- Use role-based access control for internal endpoints.

## Standard Response Shape

### Success

```json
{
  "data": {},
  "meta": {}
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": []
  }
}
```

## Authentication

### POST /api/auth/login

Internal user login.

Roles:

- Admin
- Supervisor
- Technician

Request:

```json
{
  "email": "tech@example.com",
  "password": "password"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "name": "Technician Name",
      "email": "tech@example.com",
      "role": "TECHNICIAN"
    },
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

### POST /api/auth/refresh

Refresh access token.

### POST /api/auth/logout

Invalidate current session or refresh token.

### GET /api/auth/me

Return current authenticated user profile.

## Users

### GET /api/users

List internal users.

Roles:

- Admin
- Supervisor

Query:

- role
- isActive
- search
- page
- pageSize

### POST /api/users

Create internal user.

Roles:

- Admin

### PATCH /api/users/:id

Update internal user.

Roles:

- Admin

### PATCH /api/users/:id/deactivate

Deactivate internal user.

Roles:

- Admin

## Customers

### GET /api/customers

List customers.

Roles:

- Admin
- Supervisor
- Technician

### POST /api/customers

Create customer.

Roles:

- Admin
- Supervisor

### GET /api/customers/:id

Get customer detail.

### PATCH /api/customers/:id

Update customer.

Roles:

- Admin
- Supervisor

## Machines

### GET /api/machines

List machines.

Roles:

- Admin
- Supervisor
- Technician

Query:

- customerId
- status
- serviceStatus
- search
- page
- pageSize

Suggested `serviceStatus` values:

- OK
- UPCOMING
- DUE
- OVERDUE

### POST /api/machines

Create machine.

Roles:

- Admin
- Supervisor

Request:

```json
{
  "customerId": "uuid",
  "machineName": "Filling Machine 01",
  "model": "FM-200",
  "serialNumber": "SN-001",
  "location": "Production Line A",
  "serviceReminderIntervalDays": 90,
  "installationDate": "2026-06-13",
  "warrantyExpiryDate": "2027-06-13",
  "internalRemarks": "Optional note"
}
```

### GET /api/machines/:id

Get machine detail.

### PATCH /api/machines/:id

Update machine.

Roles:

- Admin
- Supervisor

### GET /api/machines/:id/qr-code

Get or generate QR code data for the machine.

Roles:

- Admin
- Supervisor

Response:

```json
{
  "data": {
    "machineId": "uuid",
    "publicRequestUrl": "https://example.com/request/machine-public-id",
    "qrCodeImageUrl": "https://example.com/files/qr/machine-public-id.png"
  }
}
```

### PATCH /api/machines/:id/service-reminder

Update service reminder settings.

Roles:

- Admin
- Supervisor

Request:

```json
{
  "serviceReminderIntervalDays": 120,
  "nextServiceDueAt": "2026-10-11"
}
```

## Machine Logs

### GET /api/machines/:id/logs

List service and upgrade logs for a machine.

Roles:

- Admin
- Supervisor
- Technician

Query:

- logType
- dateFrom
- dateTo
- search
- page
- pageSize

### POST /api/machines/:id/logs

Create service or upgrade log for a machine.

Roles:

- Admin
- Supervisor
- Technician

Request:

```json
{
  "logType": "SERVICE",
  "workDate": "2026-06-13",
  "workSummary": "Quarterly service completed.",
  "partsUsed": "Filter cartridge",
  "upgradeVersion": null,
  "upgradeDescription": null,
  "ticketId": "uuid-or-null",
  "serviceReportId": "uuid-or-null",
  "nextServiceDueOverrideAt": null
}
```

### GET /api/machines/:id/timeline

Return full machine log timeline combining service logs, upgrade logs, and ticket logs.

Roles:

- Admin
- Supervisor
- Technician

Query:

- type
- dateFrom
- dateTo
- search
- page
- pageSize

Suggested `type` values:

- SERVICE
- UPGRADE
- TICKET

Response:

```json
{
  "data": [
    {
      "type": "SERVICE",
      "eventDate": "2026-06-13T09:00:00.000Z",
      "title": "Service completed",
      "summary": "Quarterly service completed.",
      "status": null,
      "relatedId": "uuid",
      "relatedNumber": null,
      "attachmentCount": 2,
      "actorName": "Technician Name"
    },
    {
      "type": "TICKET",
      "eventDate": "2026-06-01T08:30:00.000Z",
      "title": "Abnormal vibration",
      "summary": "Requester reported abnormal vibration.",
      "status": "CLOSED",
      "relatedId": "uuid",
      "relatedNumber": "TCK-202606-0001",
      "attachmentCount": 1,
      "actorName": "Requester Name"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 2
  }
}
```

## Public Requester Flow

### GET /api/public/machines/:publicId/request

Get public machine information for QR request form.

Public access.

Response should expose only safe machine details:

```json
{
  "data": {
    "publicId": "machine-public-id",
    "machineName": "Filling Machine 01",
    "model": "FM-200",
    "serialNumber": "SN-001",
    "location": "Production Line A",
    "customerName": "Customer Name",
    "isActive": true
  }
}
```

### POST /api/public/machines/:publicId/tickets

Submit public support ticket from QR code.

Public access.

Request:

```json
{
  "requesterName": "Requester Name",
  "requesterCompany": "Customer Name",
  "requesterDepartment": "Production",
  "requesterPhone": "+60123456789",
  "requesterEmail": "requester@example.com",
  "issueTitle": "Machine stopped",
  "issueDescription": "Machine stopped during production.",
  "issueCategory": "BREAKDOWN",
  "priority": "MACHINE_DOWN"
}
```

Response:

```json
{
  "data": {
    "ticketId": "uuid",
    "ticketNumber": "TCK-202606-0001",
    "status": "NEW"
  }
}
```

## Tickets

### GET /api/tickets

List tickets.

Roles:

- Admin
- Supervisor
- Technician

Query:

- status
- priority
- customerId
- machineId
- assignedTechnicianId
- dateFrom
- dateTo
- search
- page
- pageSize

### GET /api/tickets/:id

Get ticket detail.

### PATCH /api/tickets/:id/status

Update ticket status.

Roles:

- Admin
- Supervisor
- Technician

Request:

```json
{
  "status": "IN_PROGRESS",
  "comment": "Started diagnosis."
}
```

### PATCH /api/tickets/:id/assign

Assign or reassign ticket.

Roles:

- Admin
- Supervisor

Request:

```json
{
  "assignedTechnicianId": "uuid",
  "comment": "Assigning to technician."
}
```

## Attachments

### POST /api/tickets/:id/attachments

Upload requester or technician attachment to ticket.

Roles:

- Admin
- Supervisor
- Technician

Public requester uploads may use a separate public upload endpoint after ticket creation.

### POST /api/service-reports/:id/attachments

Upload attachment to service report.

Roles:

- Admin
- Supervisor
- Technician

### POST /api/machine-logs/:id/attachments

Upload attachment to machine service or upgrade log.

Roles:

- Admin
- Supervisor
- Technician

## Service Reports

### POST /api/tickets/:id/service-report

Create or update service report for a ticket.

Roles:

- Admin
- Supervisor
- Technician

Request:

```json
{
  "diagnosis": "Bearing wear detected.",
  "actionTaken": "Replaced bearing and tested machine.",
  "partsUsed": "Bearing B-100",
  "recommendations": "Monitor vibration for next 7 days.",
  "technicianRemarks": "Machine running normally after test.",
  "serviceStartAt": "2026-06-13T09:00:00.000Z",
  "serviceEndAt": "2026-06-13T11:00:00.000Z",
  "resolutionStatus": "RESOLVED"
}
```

### POST /api/tickets/:id/submit-for-acknowledgement

Submit completed ticket/service report for requester acknowledgement.

Roles:

- Admin
- Supervisor
- Technician

Response:

```json
{
  "data": {
    "ticketId": "uuid",
    "status": "PENDING_ACKNOWLEDGEMENT",
    "acknowledgementUrl": "https://example.com/acknowledgement/token"
  }
}
```

### GET /api/tickets/:id/pdf

Generate or download service report PDF.

Roles:

- Admin
- Supervisor
- Technician

## Public Acknowledgement Flow

### GET /api/public/acknowledgements/:token

Get acknowledgement detail for requester.

Public access with secure token.

### POST /api/public/acknowledgements/:token/accept

Requester accepts service and signs.

Public access with secure token.

Request:

```json
{
  "requesterName": "Requester Name",
  "signatureAttachmentId": "uuid",
  "comment": "Service accepted."
}
```

### POST /api/public/acknowledgements/:token/follow-up

Requester requests follow-up.

Public access with secure token.

Request:

```json
{
  "requesterName": "Requester Name",
  "comment": "Issue still occurs after restart."
}
```

## Service Reminders

### GET /api/service-reminders

List machines by service reminder status.

Roles:

- Admin
- Supervisor

Query:

- status
- dueBefore
- customerId
- page
- pageSize

Suggested `status` values:

- UPCOMING
- DUE
- OVERDUE

### POST /api/service-reminders/run

Manually trigger service reminder check.

Roles:

- Admin

Normally this should run as a scheduled backend job.

### GET /api/machines/:id/service-reminder-logs

List reminder history for one machine.

Roles:

- Admin
- Supervisor

## Audit Logs

### GET /api/audit-logs

List audit logs.

Roles:

- Admin

Query:

- actorUserId
- entityType
- entityId
- action
- dateFrom
- dateTo
- page
- pageSize

## Authorization Summary

Public requester endpoints:

- `GET /api/public/machines/:publicId/request`
- `POST /api/public/machines/:publicId/tickets`
- `GET /api/public/acknowledgements/:token`
- `POST /api/public/acknowledgements/:token/accept`
- `POST /api/public/acknowledgements/:token/follow-up`

Technician endpoints:

- View machines
- View machine timeline
- View assigned/open tickets based on rules
- Update ticket status
- Create service report
- Create machine logs
- Upload attachments

Supervisor endpoints:

- Technician permissions
- Assign/reassign tickets
- Manage customers and machines
- Configure service reminders
- View reports

Admin endpoints:

- Full access
- Manage users
- Trigger service reminder checks
- View audit logs

## Open API Decisions

1. Should attachment upload go directly through the backend, or use pre-signed upload URLs?
2. Should auth use bearer tokens or HTTP-only cookies?
3. Should public ticket submission support attachments in the same request, or upload attachments after ticket creation?
4. Should service reminders automatically create tickets when due?
5. Should the machine timeline include every ticket status change, or only ticket creation/closure summary?
6. Should technicians see all open tickets or only assigned tickets?

