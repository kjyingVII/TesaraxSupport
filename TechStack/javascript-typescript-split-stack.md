# JavaScript / TypeScript Split Frontend and Backend Stack

## Recommended Stack

Use a split application with a dedicated frontend app and backend API.

### Frontend

- Framework: Next.js
- Language: TypeScript
- UI: React
- Styling: Tailwind CSS
- Component library: shadcn/ui or Radix UI
- Theme support: next-themes with light, dark, and system preference options
- Forms: React Hook Form
- Validation: Zod
- API client: TanStack Query or typed fetch wrapper
- Signature capture: signature_pad or react-signature-canvas
- QR scanning, if needed later: browser camera API or html5-qrcode

### Backend

- Framework: NestJS
- Language: TypeScript
- Runtime: Node.js LTS
- API style: REST API first
- ORM: Prisma
- Database: PostgreSQL
- Authentication: JWT access token + refresh token, or secure HTTP-only cookies
- Authorization: role-based access control
- File upload: S3-compatible object storage
- Queue/background jobs: BullMQ with Redis
- Email/notification: provider abstraction, starting with email
- PDF generation: server-side PDF generation service/module

### Infrastructure

- Database: PostgreSQL
- Cache/queue: Redis
- Object storage: AWS S3, Cloudflare R2, MinIO, or other S3-compatible storage
- Deployment: Docker containers
- Reverse proxy: Nginx, Caddy, or cloud load balancer
- CI/CD: GitHub Actions or similar

## Why This Stack Fits the Support System

This system is workflow-heavy. It needs clear ownership between public request forms, technician operations, admin controls, file storage, reports, and acknowledgement signatures.

Next.js is a good frontend choice because it handles mobile requester pages, dashboard screens, routing, and future PWA capabilities well.

NestJS is a good backend choice because it gives a structured TypeScript backend with controllers, services, modules, guards, validation pipes, and dependency injection. That structure is useful for a system that will grow beyond basic CRUD.

PostgreSQL is preferred over MongoDB because the data is strongly relational: machines, tickets, users, assignments, service reports, attachments, status history, and acknowledgements all connect to each other.

## Application Responsibilities

### Frontend Responsibilities

- Public QR-code request page
- Requester form
- Requester attachment upload UI
- Ticket confirmation screen
- Technician login page
- Technician dashboard
- Ticket list, filters, and search
- Ticket detail page
- Machine full log timeline page with service logs, upgrade logs, and ticket logs
- Service report form
- Acknowledgement page
- Digital signature capture
- Admin machine and user management screens
- Light and dark theme selection
- Responsive layouts for mobile phones, tablets, and desktop screens

## Frontend Experience Requirements

The frontend should be designed mobile-first because requesters will usually scan a machine QR code using a phone.

Required frontend behavior:

- User can switch between light theme and dark theme.
- User can optionally follow the device system theme.
- Theme choice is remembered for future visits on the same device.
- Public request form works comfortably on mobile phone screens.
- Acknowledgement and signature page works on touch screens.
- Technician dashboard works on desktop and tablet, with a usable mobile layout for quick checks.
- Forms use large enough touch targets for phone users.
- Important actions remain easy to reach without horizontal scrolling.

### Backend Responsibilities

- Authentication and session/token handling
- Role-based permissions
- Machine records
- Machine service reminder intervals
- Machine service and upgrade logs
- QR code target URLs
- Ticket creation
- Ticket assignment
- Ticket status transitions
- Attachment upload authorization
- Service report management
- Requester acknowledgement
- Signature storage
- Notification sending
- Scheduled service reminder checks
- PDF report generation
- Audit log and ticket history
- Data export

## Suggested Repository Structure

Use a monorepo so frontend and backend can share types and development tooling.

```text
SupportSystem/
  apps/
    web/
      # Next.js frontend
    api/
      # NestJS backend
  packages/
    shared/
      # Shared TypeScript types, constants, validation schemas
  docs/
    # Architecture and product documentation
  UserStory/
    # User story documents
  TechStack/
    # Technology decisions
```

## Recommended Backend Modules

```text
AuthModule
UsersModule
RolesModule
CustomersModule
MachinesModule
MachineLogsModule
ServiceRemindersModule
QrCodesModule
TicketsModule
TicketStatusHistoryModule
AttachmentsModule
ServiceReportsModule
AcknowledgementsModule
NotificationsModule
PdfReportsModule
AuditLogsModule
```

## Recommended Main Database Tables

- users
- roles
- customers
- machines
- machine_logs
- service_reminder_logs
- tickets
- ticket_status_history
- ticket_comments
- ticket_assignments
- attachments
- service_reports
- service_report_parts
- acknowledgements
- audit_logs
- notification_logs

## API Design

Start with REST because it is simple, predictable, and easy to test.

Example endpoints:

```text
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/machines
POST   /api/machines
GET    /api/machines/:id
PATCH  /api/machines/:id
GET    /api/machines/:id/qr-code
GET    /api/machines/:id/logs
GET    /api/machines/:id/timeline
POST   /api/machines/:id/logs
PATCH  /api/machines/:id/service-reminder

GET    /api/public/machines/:publicId/request
POST   /api/public/machines/:publicId/tickets

GET    /api/tickets
GET    /api/tickets/:id
PATCH  /api/tickets/:id/status
PATCH  /api/tickets/:id/assign

POST   /api/tickets/:id/attachments
POST   /api/tickets/:id/service-report
POST   /api/tickets/:id/submit-for-acknowledgement

GET    /api/public/acknowledgements/:token
POST   /api/public/acknowledgements/:token/accept
POST   /api/public/acknowledgements/:token/follow-up

GET    /api/tickets/:id/pdf
```

## Authentication and Access Model

### Public Users

Requesters should not need to log in for the first MVP. They access:

- Public machine request form through QR code
- Public acknowledgement page through a secure token link

Security requirement:

- Public machine IDs must be random and hard to guess.
- Acknowledgement tokens must be random, expiring, and scoped to one ticket.

### Internal Users

Internal users log in:

- Admin
- Supervisor
- Technician

Suggested permissions:

- Admin: manage everything
- Supervisor: assign tickets, view reports, manage technician work
- Technician: view assigned/open tickets, update status, write service reports

## File Storage

Store files in S3-compatible storage, not directly in the database.

Store metadata in PostgreSQL:

- file name
- file type
- file size
- storage key
- uploader type
- uploader ID, if internal user
- related ticket/report/acknowledgement

Recommended buckets or prefixes:

```text
requester-attachments/
technician-attachments/
signatures/
generated-pdfs/
```

## PDF Report Generation

Generate final service report PDFs from backend data.

PDF should include:

- Ticket number
- Machine details
- Customer/site details
- Requester information
- Original issue
- Technician diagnosis
- Action taken
- Parts used
- Technician attachments list
- Requester acknowledgement
- Signature
- Date/time records

## Notification Strategy

Start with email notifications.

Suggested notification events:

- Ticket created
- Ticket assigned
- Status changed
- Machine service upcoming
- Machine service due
- Machine service overdue
- Ticket submitted for acknowledgement
- Requester accepted service
- Requester requested follow-up

Later add:

- SMS
- WhatsApp
- Microsoft Teams
- Telegram

## MVP Build Order

1. Set up monorepo with Next.js frontend and NestJS backend.
2. Set up PostgreSQL and Prisma schema.
3. Build internal authentication and roles.
4. Build machine management.
5. Add machine service reminder interval and next service due date.
6. Generate QR public links.
7. Build public ticket submission form.
8. Add attachment upload.
9. Build technician ticket dashboard.
10. Add ticket status and assignment.
11. Build service report form.
12. Add machine service and upgrade logs.
13. Add service reminder scheduled job and notifications.
14. Build acknowledgement page and signature capture.
15. Generate completed service report PDF.
16. Add email notifications.
17. Add audit log and basic reports.

## Recommended Decision

Use:

```text
Next.js + TypeScript frontend
NestJS + TypeScript backend
PostgreSQL database
Prisma ORM
S3-compatible file storage
Redis + BullMQ for queues
Docker for deployment
```

This gives the project a modern JavaScript/TypeScript stack while keeping the backend disciplined enough for a real service-ticket and reporting system.
