# Project Activity Log

This file records meaningful project updates, decisions, and implementation steps.

## 2026-06-13

### Planning

- Created initial user story master document for the machine support system.
- Split user stories by role:
  - Requester
  - Technician
  - Admin/Supervisor
  - Shared workflow and MVP notes
- Added frontend requirements for light theme, dark theme, system theme preference, and mobile-friendly requester pages.
- Added machine service and upgrade log requirements.
- Added per-machine service reminder interval requirement, such as 90 days or 120 days.
- Added full machine log timeline requirement combining service logs, upgrade logs, and ticket logs.
- Created system workflow and business rules document.
- Created database schema planning document.
- Created API contract planning document.
- Selected JavaScript/TypeScript split architecture:
  - Next.js frontend
  - NestJS backend
  - PostgreSQL database
  - Prisma ORM
  - S3-compatible object storage
  - Redis/BullMQ for reminders and background jobs

### Project Scaffold

- Created monorepo structure:
  - `apps/web`
  - `apps/api`
  - `packages/shared`
  - `Docs`
  - `UserStory`
  - `TechStack`
- Added root package configuration, shared TypeScript configuration, workspace configuration, and environment example.
- Added starter Next.js frontend with light/dark/system theme selector.
- Added starter NestJS backend with health endpoint.
- Added shared TypeScript enums and timeline item type.

### Docker

- Added Docker Compose setup with separate containers:
  - `support-system-web`
  - `support-system-api`
  - `support-system-db`
  - `support-system-redis`
- Added separate Dockerfiles for frontend and backend.
- Verified Docker Compose configuration.
- Started containers successfully.
- Changed host ports because Windows blocked host port `4000`:
  - Frontend host URL: `http://localhost:13000`
  - Backend host URL: `http://localhost:14000`
- Verified frontend returns HTTP 200.
- Verified backend health endpoint returns status `ok`.

### Database and Prisma

- Updated API Dockerfile to install OpenSSL for Prisma compatibility.
- Expanded Prisma schema with MVP models:
  - `User`
  - `Customer`
  - `Machine`
  - `Ticket`
  - `TicketStatusHistory`
  - `TicketComment`
  - `TicketAssignment`
  - `ServiceReport`
  - `MachineLog`
  - `Acknowledgement`
  - `Attachment`
  - `ServiceReminderLog`
  - `AuditLog`
  - `NotificationLog`
- Validated Prisma schema successfully.
- Generated Prisma Client successfully.
- Ran initial Prisma migration successfully.
- Copied generated migration files from the API container back into the workspace.
- Verified PostgreSQL contains the expected database tables.
- Verified API remained healthy after migration.

### Process

- Added this project activity log.
- Going forward, meaningful updates should be appended to this file.

### Backend Infrastructure

- Added `PrismaModule` and `PrismaService` to the NestJS API.
- Updated `AppModule` to import Prisma infrastructure.
- Updated `/api/health` to perform a lightweight database timestamp query through Prisma.
- Fixed API Dockerfile so `prisma generate` runs after the Prisma schema is copied into the image.
- Rebuilt and restarted the API container.
- Verified NestJS compiles successfully with Prisma enabled.
- Verified `/api/health` returns API status and database status.

### Customers API

- Added `CustomersModule`, `CustomersController`, and `CustomersService`.
- Added DTO type files for customer create and update requests.
- Registered `CustomersModule` in the NestJS app.
- Added customer endpoints:
  - `GET /api/customers`
  - `POST /api/customers`
  - `GET /api/customers/:id`
  - `PATCH /api/customers/:id`
  - `PATCH /api/customers/:id/deactivate`
- Rebuilt and restarted the API container.
- Verified customer create, list, detail, update, and deactivate flows through HTTP requests.
- Verified API logs show customer routes mapped successfully.

### Machines API

- Added `MachinesModule`, `MachinesController`, and `MachinesService`.
- Added DTO type files for machine create, update, and service reminder update requests.
- Registered `MachinesModule` in the NestJS app.
- Added machine endpoints:
  - `GET /api/machines`
  - `POST /api/machines`
  - `GET /api/machines/:id`
  - `PATCH /api/machines/:id`
  - `GET /api/machines/:id/qr-code`
  - `PATCH /api/machines/:id/service-reminder`
- Added generated random `publicId` for QR/request links.
- Added public request URL generation using `WEB_APP_URL`.
- Added service reminder interval and next service due date handling.
- Updated Docker Compose `WEB_APP_URL` for API container to use host frontend URL `http://localhost:13000`.
- Rebuilt and restarted the API container.
- Verified machine create, list, detail, QR data, and service reminder update flows through HTTP requests.
- Verified QR public request URL points to `http://localhost:13000/request/:publicId`.
- Verified API logs show machine routes mapped successfully.

### Public QR Request API

- Added `PublicRequestsModule`, `PublicRequestsController`, and `PublicRequestsService`.
- Added DTO type file for public ticket submission.
- Registered `PublicRequestsModule` in the NestJS app.
- Added public QR endpoints:
  - `GET /api/public/machines/:publicId/request`
  - `POST /api/public/machines/:publicId/tickets`
- Public machine endpoint returns safe machine details only.
- Public ticket submission creates a `NEW` ticket linked to the scanned machine.
- Public ticket submission creates an initial `TicketStatusHistory` record.
- Ticket numbers are generated in the format `TCK-YYYYMM-0001`.
- Rebuilt and restarted the API container.
- Verified public machine lookup and ticket submission through HTTP requests.
- Verified ticket status history row exists through Prisma.
- Verified API logs show public request routes mapped successfully.

### Tickets API

- Added `TicketsModule`, `TicketsController`, and `TicketsService`.
- Added DTO type files for ticket assignment and status update requests.
- Registered `TicketsModule` in the NestJS app.
- Added internal ticket endpoints:
  - `GET /api/tickets`
  - `GET /api/tickets/:id`
  - `PATCH /api/tickets/:id/status`
  - `PATCH /api/tickets/:id/assign`
- Added ticket list filtering by status, priority, customer, machine, assigned technician, date range, and search text.
- Added ticket detail response with machine, customer, assigned technician, attachments, comments, status history, service reports, acknowledgement, and machine logs.
- Added status transition validation based on the documented ticket flow.
- Added assignment validation for active technician users.
- Added ticket assignment history and ticket status history creation.
- Rebuilt and restarted the API container.
- Verified ticket list, detail, assign, and status update flows through HTTP requests.
- Verified API logs show ticket routes mapped successfully.

## 2026-06-14

### Machine Logs and Timeline API

- Added `MachineLogsModule`, `MachineLogsController`, and `MachineLogsService`.
- Added DTO type file for machine service/upgrade log creation.
- Registered `MachineLogsModule` in the NestJS app.
- Added machine log endpoints:
  - `GET /api/machines/:machineId/logs`
  - `POST /api/machines/:machineId/logs`
  - `GET /api/machines/:machineId/timeline`
- Service logs update the machine's `lastServiceAt` and recalculate `nextServiceDueAt`.
- Upgrade logs update the machine's `lastUpgradeAt`.
- Timeline endpoint combines service logs, upgrade logs, and ticket logs in newest-first order.
- Timeline endpoint supports filtering by type, date range, search, page, and page size.
- Rebuilt and restarted the API container.
- Verified service log creation, upgrade log creation, machine date updates, log listing, and combined timeline through HTTP requests.
- Verified API logs show machine log routes mapped successfully.
- Verified `/api/health` remains healthy after the change.

### Service Reports API

- Added `ServiceReportsModule`, `ServiceReportsController`, and `ServiceReportsService`.
- Added DTO type file for service report create/update requests.
- Registered `ServiceReportsModule` in the NestJS app.
- Added service report endpoints:
  - `POST /api/tickets/:ticketId/service-report`
  - `GET /api/service-reports/:id`
- Service report endpoint creates a report for a ticket if none exists.
- Service report endpoint updates the existing ticket report if one already exists.
- Added validation for active technician users.
- Added validation for required diagnosis, action taken, service start/end time, and resolution status.
- Rebuilt and restarted the API container.
- Verified service report create, update, and detail flows through HTTP requests.
- Verified API logs show service report routes mapped successfully.
- Verified `/api/health` remains healthy after the change.

### Acknowledgement API

- Added `AcknowledgementsModule`, `AcknowledgementsController`, and `AcknowledgementsService`.
- Added DTO type files for submitting acknowledgement, accepting service, and requesting follow-up.
- Registered `AcknowledgementsModule` in the NestJS app.
- Added acknowledgement endpoints:
  - `POST /api/tickets/:ticketId/submit-for-acknowledgement`
  - `GET /api/public/acknowledgements/:token`
  - `POST /api/public/acknowledgements/:token/accept`
  - `POST /api/public/acknowledgements/:token/follow-up`
- Submission requires the ticket to have a service report and status `RESOLVED`.
- Submission creates or resets an acknowledgement token and moves the ticket to `PENDING_ACKNOWLEDGEMENT`.
- Public acknowledgement lookup returns ticket, machine, customer, and latest service report details.
- Accept flow records requester name, comment, signature metadata placeholder, and closes the ticket.
- Follow-up flow records requester name/comment and moves the ticket to `FOLLOW_UP_REQUIRED`.
- Acknowledgement tokens are stored as SHA-256 hashes.
- Default acknowledgement link expiry is 14 days.
- Rebuilt and restarted the API container.
- Verified full accept-and-close acknowledgement flow through HTTP requests.
- Verified follow-up acknowledgement flow through HTTP requests.
- Verified acknowledgement routes are mapped successfully.
- Verified `/api/health` remains healthy after the change.

### Public QR Request Frontend

- Added frontend API helper for calling the backend from Next.js.
- Added public QR request route:
  - `/request/:publicId`
- Added mobile-friendly requester ticket form.
- Request page loads safe machine information from `GET /api/public/machines/:publicId/request`.
- Request page submits tickets to `POST /api/public/machines/:publicId/tickets`.
- Request page shows ticket number and status after successful submission.
- Request page supports light, dark, and system theme through the existing theme selector.
- Updated the starter home page to mention the public QR request route.
- Rebuilt and restarted the frontend container.
- Verified the request page compiles and returns HTTP 200 for a real machine `publicId`.
- Verified frontend logs show `/request/[publicId]` compiled successfully.

### Public Acknowledgement Frontend

- Added public acknowledgement frontend route:
  - `/acknowledgement/:token`
- The page loads public acknowledgement details from `GET /api/public/acknowledgements/:token`.
- The page displays ticket details, machine details, and the latest service report.
- The page supports requester accept/sign and follow-up response actions.
- Rebuilt and restarted the frontend container.
- Created a real test ticket and generated acknowledgement link:
  - `http://localhost:13000/acknowledgement/wqoHgtPheSNpDdFXu0u3_rZVrw79ZRrH6oLhwTxTs1Y`
- Verified the acknowledgement page returns HTTP 200.
- Verified frontend logs show `/acknowledgement/[token]` compiled successfully.
- Verified backend CORS allows the frontend origin `http://localhost:13000`.
- Verified frontend TypeScript check passes inside the web container.
- Browser visual verification was attempted, but the in-app browser connection was blocked by a local `EPERM` permission error while starting.
- Replaced the acknowledgement signature text field with a mobile-friendly drawing canvas.
- Added a clear button so the requester can redraw the signature before submitting.
- Rebuilt and restarted the frontend container after the signature pad change.
- Verified the acknowledgement page still returns HTTP 200.
- Verified frontend logs show `/acknowledgement/[token]` compiled successfully after the signature pad change.
- Added requester contact number capture to acknowledgement accept and follow-up responses.
- Added `requesterPhone` to the acknowledgement database model and API DTOs.
- Updated the acknowledgement page to prefill contact number from the original ticket where available.
- Added and applied Prisma migration `20260614020200_add_acknowledgement_requester_phone`.
- Rebuilt and restarted the API and frontend containers.
- Verified API and frontend TypeScript checks pass.
- Verified acknowledgement accept flow stores requester contact number.
- Verified acknowledgement follow-up flow stores requester contact number.
- Verified the acknowledgement page still returns HTTP 200 after the contact number change.
- Added requester email capture to acknowledgement accept and follow-up responses.
- Added `requesterEmail` to the acknowledgement database model and API DTOs.
- Updated the acknowledgement page to prefill email from the original ticket where available.
- Updated public acknowledgement lookup to return saved acknowledgement phone and email values.
- Added and applied Prisma migration `20260614023000_add_acknowledgement_requester_email`.
- Rebuilt and restarted API and frontend containers after the acknowledgement email change.
- Verified API and frontend TypeScript checks pass.
- Created demo acknowledgement ticket `TCK-202606-0010` for manual verification.
- Demo acknowledgement link:
  - `http://localhost:13000/acknowledgement/C4-Ipgt08C071oVp97rUWVJsCkX45QE96FlM8__CWOg`
- Verified the demo acknowledgement page returns HTTP 200.
- Verified `/api/health` remains healthy after the email change.

### Technician Ticket Workbench Frontend

- Started the first technician-facing frontend page.
- Added technician ticket workbench route:
  - `/technician/tickets`
- The page loads tickets from `GET /api/tickets`.
- The page supports search and status filtering.
- The page shows ticket status, priority, requester, machine, customer, and created date.
- The page loads selected ticket detail from `GET /api/tickets/:id`.
- The detail panel shows requester contact, machine information, latest service report, and status history.
- Updated the home page to reference the technician workbench route.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/technician/tickets` returns HTTP 200.
- Verified frontend logs show `/technician/tickets` compiled successfully.
- Added technician status action buttons in ticket detail.
- Added service report form for diagnosis, action taken, parts used, recommendations, remarks, service time, and resolution status.
- Added submit-for-acknowledgement button after a ticket is resolved and has a service report.
- Verified frontend TypeScript check passes after adding technician actions.
- Rebuilt and restarted the frontend container.
- Verified `/technician/tickets` returns HTTP 200 after adding technician actions.
- Verified frontend logs show `/technician/tickets` compiled successfully after adding technician actions.
- Ran smoke test for the technician action workflow:
  - assign technician
  - move ticket to `IN_PROGRESS`
  - save service report
  - move ticket to `RESOLVED`
  - submit for acknowledgement
- Smoke test created ticket `TCK-202606-0011` and acknowledgement link:
  - `http://localhost:13000/acknowledgement/AbQCYUFuPSEwG4M-qnErGnN2sLS9dUdWtIse_o52vtQ`

### Machine Full Log Frontend

- Started the full machine log frontend page.
- Added machine log route:
  - `/machines/:machineId/logs`
- The page loads machine detail from `GET /api/machines/:machineId`.
- The page loads combined timeline entries from `GET /api/machines/:machineId/timeline`.
- Timeline combines service logs, upgrade logs, and ticket logs.
- Added timeline type filtering and search.
- Added manual service/upgrade log form using `POST /api/machines/:machineId/logs`.
- Added machine service reminder summary showing last service, next service, and due/overdue state.
- Added a link from technician ticket detail to the full machine log page.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/machines/c496a203-d211-4108-bd45-f9af141bec6e/logs` returns HTTP 200.
- Verified frontend logs show `/machines/[machineId]/logs` compiled successfully.
- Ran machine log smoke test by creating a service log for machine `c496a203-d211-4108-bd45-f9af141bec6e`.
- Verified the created service log appears in the machine timeline.
- Verified service log creation updated `lastServiceAt` and recalculated `nextServiceDueAt`.

### Technician Service Report Display

- Updated the technician ticket detail panel to show all service reports instead of only the latest report.
- Added expandable service report rows with service time, resolution status, diagnosis, action taken, parts used, recommendations, and technician remarks.
- The newest service report is expanded by default.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/technician/tickets` returns HTTP 200.
- Verified frontend logs show `/technician/tickets` compiled successfully after the expandable service report change.

### Technician Service Report Submission Page

- Started separating service report submission from the ticket workbench.
- Added service report form route:
  - `/technician/tickets/:ticketId/service-report`
- Moved the editable service report form out of `/technician/tickets`.
- Added an `Open Service Report Form` link in the ticket detail technician actions panel.
- The new page loads ticket detail, pre-fills the latest service report when present, and saves through `POST /api/tickets/:ticketId/service-report`.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/technician/tickets` returns HTTP 200 after removing the inline service report form.
- Verified `/technician/tickets/b3540031-3de8-4f2f-b55d-9a8804b23fa0/service-report` returns HTTP 200.
- Verified frontend logs show `/technician/tickets/[ticketId]/service-report` compiled successfully.

### Machine Log Details and Separate Add Log Page

- Started separating manual machine log creation from the full machine log timeline.
- Added machine log requester contact fields:
  - `requesterContactPhone`
  - `requesterContactEmail`
- Added machine log detail API endpoint:
  - `GET /api/machines/:machineId/logs/:logId`
- Updated the full machine log page so service, upgrade, and ticket timeline items can be clicked to view details.
- Removed the inline add-log form from `/machines/:machineId/logs`.
- Added separate add-log route:
  - `/machines/:machineId/logs/new`
- Added contact number and email fields to the new add-log form.
- Added and applied Prisma migration `20260614053200_add_machine_log_contact_fields`.
- Rebuilt and restarted the API and frontend containers.
- Verified API and frontend TypeScript checks pass.
- Verified `/machines/c496a203-d211-4108-bd45-f9af141bec6e/logs` returns HTTP 200.
- Verified `/machines/c496a203-d211-4108-bd45-f9af141bec6e/logs/new` returns HTTP 200.
- Verified frontend logs show `/machines/[machineId]/logs/new` compiled successfully.
- Ran machine log contact smoke test by creating service log `2e149db3-1b63-425f-a114-cd64cabb4936`.
- Verified machine log detail endpoint returns requester contact number and email.

### Authentication MVP

- Started authentication and role foundation.
- Added backend auth module with endpoints:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Added PBKDF2 password hashing and HS256 access token signing using Node crypto.
- Added demo user seed script:
  - `apps/api/prisma/seed-demo-users.js`
- Added demo accounts:
  - `admin@example.com`
  - `technician@example.com`
- Added frontend auth helpers for token and user storage.
- Added login page:
  - `/login`
- Added client-side protection for internal pages:
  - `/technician/tickets`
  - `/technician/tickets/:ticketId/service-report`
  - `/machines/:machineId/logs`
  - `/machines/:machineId/logs/new`
- Rebuilt and restarted API and frontend containers.
- Seeded demo admin and technician accounts.
- Verified API and frontend TypeScript checks pass.
- Verified `POST /api/auth/login` returns an access token for `technician@example.com`.
- Verified `GET /api/auth/me` returns the authenticated technician when called with bearer token.
- Verified `/login` returns HTTP 200.
- Verified `/technician/tickets` returns HTTP 200 and client-side protection is mounted.
- Verified frontend logs show `/login` compiled successfully.

### Backend API Authorization

- Started backend route protection for internal APIs.
- Added `@Public()` decorator for endpoints that should remain open.
- Added `@Roles()` decorator for role-based controller access.
- Added global API auth guard that validates bearer access tokens.
- Added role checks in the global guard.
- Marked public endpoints:
  - `/api/health`
  - `/api/auth/login`
  - `/api/public/machines/:publicId/request`
  - `/api/public/machines/:publicId/tickets`
  - `/api/public/acknowledgements/:token`
  - `/api/public/acknowledgements/:token/accept`
  - `/api/public/acknowledgements/:token/follow-up`
- Protected internal ticket, service report, machine log, machine, and customer endpoints.
- Limited customer management and machine write/reminder endpoints to admin/supervisor roles.
- Fixed AuthModule provider exports so the global API guard can resolve AuthService.
- Rebuilt and restarted the API container.
- Verified API TypeScript check passes.
- Verified `/api/health` remains public.
- Verified `POST /api/auth/login` remains public.
- Verified authenticated technician can call `GET /api/tickets`.
- Verified unauthenticated `GET /api/tickets` is rejected.
- Verified technician access to `GET /api/customers` is rejected.
- Verified authenticated admin can call `GET /api/customers`.
- Verified public QR machine request endpoint remains open.

### Admin Customer and Machine UI

- Started admin management frontend.
- Added admin dashboard route:
  - `/admin`
- Added customer management route:
  - `/admin/customers`
- Customer admin supports search, create, edit, and deactivate.
- Added machine management route:
  - `/admin/machines`
- Machine admin supports search, create, edit, service reminder interval, next service due date, and internal remarks.
- Machine admin displays QR request link and links to the full machine log.
- Admin pages are protected for `ADMIN` and `SUPERVISOR` roles.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/admin`, `/admin/customers`, and `/admin/machines` return HTTP 200.
- Verified frontend logs show admin routes compiled successfully.
- Verified authenticated admin can read customer and machine API data used by the admin pages.

### Admin Dashboard

- Expanded `/admin` from a link page into a real dashboard.
- Added dashboard metrics:
  - customer count
  - machine count
  - active machine count
  - open ticket count
- Added recent tickets panel.
- Added service-due-soon panel for machines due or overdue within 30 days.
- Added quick links to customer management, machine management, and ticket workbench.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/admin` returns HTTP 200.
- Verified frontend logs show `/admin` compiled successfully.

### Admin Customer and Machine Separate Pages

- Started splitting admin customer and machine management into separate list, add, and edit screens.
- Updated `/admin/customers` to be a customer list with search, add customer link, and edit actions.
- Added customer create route:
  - `/admin/customers/new`
- Added customer edit route:
  - `/admin/customers/:customerId/edit`
- Updated `/admin/machines` to be a machine list with search, add machine link, edit action, log link, and QR request link.
- Added machine create route:
  - `/admin/machines/new`
- Added machine edit route:
  - `/admin/machines/:machineId/edit`
- Added save buttons on the dedicated customer and machine forms.
- Kept machine edit links to the full machine log and QR request link.
- Tightened protected page role checking so inline role arrays do not repeatedly trigger session checks.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified these routes return HTTP 200:
  - `/admin/customers`
  - `/admin/customers/new`
  - `/admin/customers/:customerId/edit`
  - `/admin/machines`
  - `/admin/machines/new`
  - `/admin/machines/:machineId/edit`
- Verified in the browser that the customer list shows add/edit actions.
- Verified in the browser that the machine edit page shows the save button and full machine log link.
- Verified frontend logs show the new admin routes compiled successfully.

### Admin Breadcrumbs and Edit Save Redirect

- Added breadcrumb-style navigation on `/admin/customers` with a link back to `/admin`.
- Added breadcrumb-style navigation on customer add/edit pages with links back to `/admin` and `/admin/customers`.
- Updated customer edit save flow to return to `/admin/customers` after a successful save.
- Added breadcrumb-style navigation on `/admin/machines` with a link back to `/admin`.
- Added breadcrumb-style navigation on machine add/edit pages with links back to `/admin` and `/admin/machines`.
- Updated machine edit save flow to return to `/admin/machines` after a successful save.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified customer and machine list/edit routes return HTTP 200.
- Verified in the browser that customer and machine list breadcrumbs include an Admin link.
- Verified frontend logs show the updated admin routes compiled successfully.

### Admin User Management

- Started admin-only user management.
- Added backend user management module:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `GET /api/admin/users/:id`
  - `PATCH /api/admin/users/:id`
  - `PATCH /api/admin/users/:id/password`
- Restricted user management API endpoints to `ADMIN`.
- Reused existing PBKDF2 password hashing for created and reset passwords.
- Added frontend user management list route:
  - `/admin/users`
- Added frontend add user route:
  - `/admin/users/new`
- Added frontend edit user route:
  - `/admin/users/:userId/edit`
- Added user search, role filter, active status filter, account form, and password reset form.
- Added Users link to the admin dashboard.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified authenticated admin can list and view user details through `/api/admin/users`.
- Verified technician access to `/api/admin/users` is rejected.
- Verified `/admin/users`, `/admin/users/new`, and `/admin/users/:userId/edit` return HTTP 200.
- Verified in the browser that `/admin/users` shows breadcrumb, Add User, role filter, and Edit actions.
- Verified API logs show admin user management routes mapped successfully.
- Verified frontend logs show admin user management routes compiled successfully.

### Admin Navigation Menu

- Started shared admin navigation menu.
- Added reusable admin menu with links to:
  - Customers
  - Machines
  - Users
  - Tickets
  - Settings
- Added the admin menu to the dashboard.
- Added the admin menu to customer list and customer add/edit pages.
- Added the admin menu to machine list and machine add/edit pages.
- Added the admin menu to user list and user add/edit pages.
- Added settings route:
  - `/admin/settings`
- Added basic settings page with service defaults, access summary, and theme summary.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/admin`, `/admin/customers`, `/admin/machines`, `/admin/users`, and `/admin/settings` return HTTP 200.
- Verified in the browser that the admin menu shows Customers, Machines, Users, Tickets, and Settings.
- Verified frontend logs show admin menu pages and settings route compiled successfully.

### Home Breadcrumb Wording and Tickets Breadcrumb

- Changed admin breadcrumb root wording from `Admin` to `Home`.
- Changed dashboard root label from `Admin` to `Home`.
- Added `Home / Tickets` breadcrumb to the ticket workbench.
- Added a link from ticket workbench breadcrumb back to `/admin`.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/admin/users` and `/technician/tickets` return HTTP 200.
- Verified in the browser that admin user page and ticket workbench show `Home` breadcrumb links.
- Verified frontend logs show updated admin users and ticket workbench routes compiled successfully.

### Ticket Workbench Admin Menu

- Added the shared admin navigation menu to `/technician/tickets`.
- Ticket workbench now shows navigation links for Customers, Machines, Users, Tickets, and Settings.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified `/technician/tickets` returns HTTP 200.
- Verified in the browser that the Tickets page shows Customers, Machines, Users, Tickets, and Settings links.
- Verified frontend logs show the ticket workbench route compiled successfully.

### Configurable System Settings

- Started configurable system settings.
- Added Prisma `SystemSetting` model for key/value settings storage.
- Added migration for `SystemSetting`.
- Added settings API:
  - `GET /api/settings`
  - `PATCH /api/settings`
- Settings API supports:
  - default service reminder interval days
  - reminder window days
  - company/service provider name
  - support contact email
  - support contact phone
  - acknowledgement required before closing
- Restricted settings update to `ADMIN`.
- Allowed `ADMIN` and `SUPERVISOR` to read settings.
- Replaced static `/admin/settings` summary with an editable settings form.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt API and frontend containers.
- Applied migration `20260615000100_add_system_settings`.
- Restarted API and frontend containers.
- Verified authenticated admin can read and update `/api/settings`.
- Verified `/admin/settings` returns HTTP 200.
- Verified in the browser that the settings page shows editable fields and Save Settings button.
- Verified API logs show settings routes mapped successfully.
- Verified frontend logs show settings page compiled successfully.

### Settings Applied to Workflow

- Started applying configurable settings to runtime workflow.
- Exported settings service for internal backend use.
- Machine creation now falls back to the configured default service reminder interval when no interval is supplied.
- Ticket status transition rules now read `acknowledgementRequiredBeforeClosing`.
- If acknowledgement is required, resolved tickets can move to pending acknowledgement.
- If acknowledgement is not required, resolved tickets can move directly to closed.
- Machine add form now pre-fills service reminder interval from `/api/settings`.
- Admin dashboard service-due-soon window now uses the configured reminder window days.
- Ticket workbench now reads acknowledgement policy from `/api/settings`.
- Ticket workbench shows `Submit For Acknowledgement` when acknowledgement is required.
- Ticket workbench shows `Close Ticket` when acknowledgement is not required.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified creating a machine without sending service reminder interval uses the configured default interval.
- Temporarily disabled acknowledgement requirement and verified a resolved ticket can close directly.
- Restored the original acknowledgement requirement setting after the smoke test.
- Verified `/admin`, `/admin/machines/new`, and `/technician/tickets` return HTTP 200.
- Verified in the browser that the machine form shows the service reminder interval field.
- Verified in the browser that the ticket workbench shows the acknowledgement or close-ticket action.
- Verified API and frontend logs show updated modules and routes compiled successfully.

### Audit Logs

- Started audit logging slice.
- Added `CurrentUser` decorator to read authenticated user from the request.
- Added audit module and service for writing before/after change records.
- Added audit log API:
  - `GET /api/admin/audit-logs`
- Added audit writes for:
  - settings update
  - customer update
  - customer deactivate
  - machine update
  - machine service reminder update
  - user create
  - user update
  - user password reset
  - ticket status update
- Added admin audit log page:
  - `/admin/audit-logs`
- Added filters for action and entity type on the audit log page.
- Added detail panel with actor, entity, before JSON, and after JSON.
- Added dashboard link to Audit Logs.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified updating settings creates an `UPDATE_SETTINGS` audit record.
- Verified audit API returns the actor user for the audited settings change.
- Verified `/admin` and `/admin/audit-logs` return HTTP 200.
- Verified in the browser that `/admin/audit-logs` shows filters and before/after detail.
- Verified API logs show audit route mapped successfully.
- Verified frontend logs show audit page compiled successfully.

### Ticket Attachments

- Started ticket attachment upload handling.
- Added Docker named volume for API upload storage:
  - `attachment-data:/app/uploads`
- Added backend attachment module.
- Added ticket attachment endpoints:
  - `GET /api/tickets/:ticketId/attachments`
  - `POST /api/tickets/:ticketId/attachments`
  - `GET /api/attachments/:id/download`
- Ticket attachment uploads store files in local Docker storage and metadata in `Attachment`.
- Ticket attachment upload validates file name, content type, non-empty data, and 10 MB maximum size.
- Ticket detail now includes attachment uploader information.
- Added ticket workbench attachment upload form.
- Added ticket workbench attachment list and download links.
- Added query token support for protected download links.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified Docker created the `attachment-data` volume.
- Verified API can upload a text attachment to a ticket.
- Verified API can list ticket attachments.
- Verified API can download the uploaded attachment content.
- Verified `/technician/tickets` returns HTTP 200.
- Verified in the browser that the ticket page shows attachment section, file input, and Upload button.
- Verified API logs show attachment routes mapped successfully.
- Verified frontend logs show ticket page compiled successfully.

### Service Report Attachments

- Started service report attachment handling.
- Added service report attachment endpoints:
  - `GET /api/service-reports/:serviceReportId/attachments`
  - `POST /api/service-reports/:serviceReportId/attachments`
- Reused existing attachment download endpoint:
  - `GET /api/attachments/:id/download`
- Service report attachments store files in local Docker upload storage and metadata in `Attachment`.
- Service report detail now includes attachment uploader information.
- Ticket detail service reports now include their attachment lists.
- Added upload/list section on the service report form page.
- Added service report attachment links inside expanded service reports on ticket detail page.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified API can upload a text attachment to a service report.
- Verified API can list service report attachments.
- Verified API can download the uploaded service report attachment content.
- Verified `/technician/tickets` and `/technician/tickets/:ticketId/service-report` return HTTP 200.
- Verified in the browser that the service report page shows attachment upload controls.
- Verified in the browser that ticket detail shows service report attachment labels.
- Verified API logs show service report attachment routes mapped successfully.
- Verified frontend logs show service report and ticket pages compiled successfully.

### Attachment Size Limits

- Confirmed attachment files are written by the API container under `/app/uploads`.
- Confirmed Docker persists uploaded files in the `attachment-data` named volume mounted into the API container.
- Confirmed individual ticket and service report attachments are limited to 10 MB per file.
- Added backend enforcement for service report attachment total size:
  - 100 MB maximum total attachments per service report.
- Added service report page wording for the upload limit:
  - 10 MB per file.
  - 100 MB total per service report.
- Added frontend pre-upload validation for service report attachment size limits.
- Rebuilt and restarted the API and frontend containers after adding the limit.
- Verified API TypeScript check passes after the backend limit change.
- Verified frontend TypeScript check passes after the UI validation change.
- Verified API rejects a service report upload that would exceed 100 MB total with HTTP 400.
- Cleaned up temporary smoke-test customer, machine, ticket, service report, and attachment rows.
- Verified in the browser that the service report page displays the 10 MB per file and 100 MB per report attachment limit.

### Public Ticket Request Attachments

- Started adding attachment support to the public QR ticket request flow.
- Added `attachments` to the public ticket request payload.
- Reused the existing local attachment storage and `Attachment` table for requester-uploaded ticket attachments.
- Added requester upload attribution through `uploadedByRequesterName`.
- Added backend validation for ticket attachments:
  - 10 MB maximum per file.
  - 100 MB maximum total per ticket.
- Applied the 100 MB total ticket attachment limit to technician ticket attachment uploads too.
- Increased API JSON body parsing limit for base64 attachment payloads.
- Added a mobile-friendly multi-file attachment section to the public request form.
- Added frontend pre-submit validation for public request attachment size limits.
- Added selected file names, file sizes, and total selected size to the public request form.
- Rebuilt and restarted API and frontend containers for the public ticket attachment changes.
- Verified API TypeScript check passes after rebuild.
- Verified frontend TypeScript check passes after rebuild.
- Created public ticket `TCK-202606-0013` from QR public request API with one attachment.
- Verified ticket detail API returns the requester-uploaded attachment metadata.
- Verified requester upload attribution is stored in `uploadedByRequesterName`.
- Verified in the browser that the public QR request page shows the Attachments section, file picker, and 10 MB per file / 100 MB per request limit text.

### Configurable Attachment Limits

- Started making attachment limits configurable by admin.
- Added settings for request/ticket attachments:
  - maximum file size in MB.
  - maximum total size in MB.
- Added settings for service report attachments:
  - maximum file size in MB.
  - maximum total size in MB.
- Kept defaults at 10 MB per file and 100 MB total.
- Updated backend attachment validation to read limits from system settings.
- Updated public QR machine request response to include request attachment limits.
- Updated public QR request form to display and validate the configured request attachment limits.
- Updated service report form to display and validate the configured service report attachment limits.
- Updated technician ticket workbench upload validation to use configured request attachment limits.
- Added admin settings page fields for all attachment limit settings.
- Added backend validation that attachment max file MB cannot exceed max total MB for each attachment category.
- Rebuilt and restarted API and frontend containers for configurable attachment limits.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Verified settings API returns request and service report attachment limit fields.
- Verified changing request attachment max file MB is reflected by the public QR machine request endpoint.
- Reset attachment limits back to the default 10 MB per file and 100 MB total after verification.
- Verified the public QR request page displays the configured request attachment limit text in the browser.

### Machine Log Attachments

- Started adding attachment support for machine service and upgrade logs.
- Added `attachments` to the machine log create payload.
- Added backend save handling for machine log attachments using `AttachmentRelatedType.MACHINE_LOG`.
- Machine log files are stored under `/app/uploads/machine-logs/:machineLogId`.
- Machine log attachments reuse the configurable request/ticket attachment limits.
- Added attachment upload controls to the Add Service / Upgrade Log page.
- Added frontend attachment file size and total size validation to the Add Log page.
- Added attachment download links to the machine log detail panel in Full Machine Log.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Created smoke-test machine service log `f517c19c-4590-4cd3-b5de-6441692b9d7e` with one attachment.
- Verified machine log detail API returns the uploaded attachment metadata.
- Verified in the browser that the Add Log page shows attachment upload controls and the configured limit text.
- Verified in the browser that the Full Machine Log timeline shows the smoke log with attachment count.

### Service Reminders Worklist

- Started dedicated service reminders worklist.
- Updated machine service status filtering to use the configured reminder window days.
- Added `NO_REMINDER` machine service status filter.
- Changed `OK` service status to only include machines due beyond the reminder window.
- Added `/admin/reminders` page.
- Added reminder summary buckets for Upcoming, Due Today, Overdue, No Reminder, and OK.
- Added search and service status filters to the reminders page.
- Added quick links from reminder rows to:
  - full machine log.
  - add service log.
  - edit machine reminder.
- Added Reminders to the admin menu.
- Added Reminders shortcut to the admin dashboard.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified reminder API filters respond for UPCOMING, DUE, OVERDUE, NO_REMINDER, and OK.
- Verified `/admin/reminders` renders the Service Reminders page structure in the browser.
- Corrected the Reminders page route guard to admin/supervisor only because it uses admin settings data.
- Rebuilt and restarted the frontend container after the route guard correction.

### Logout Feature

- Started logout feature.
- Added reusable frontend `LogoutButton` component.
- Logout clears the stored access token and user session from local storage.
- Logout redirects the user back to `/login`.
- Added Logout button to the authenticated admin navigation menu.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified the login page renders after the frontend restart.

### User Profile And Role-Aware Navigation

- Started role-aware navigation and self-service profile work.
- Updated auth user payload to include contact number.
- Added authenticated profile API:
  - `GET /api/profile`
  - `PATCH /api/profile`
  - `PATCH /api/profile/password`
- Added current-password verification for self-service password changes.
- Added audit writes for:
  - `UPDATE_OWN_PROFILE`
  - `CHANGE_OWN_PASSWORD`
- Added `/profile` frontend page for all authenticated roles.
- Profile page allows user to update:
  - name.
  - email.
  - contact number.
  - password.
- Added Profile link to the authenticated navigation menu.
- Updated navigation menu to hide links the logged-in role cannot access.
- Technician menu now only shows technician-accessible links plus Profile and Logout.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Verified technician profile API can read the profile.
- Verified technician can update and reset contact number through the profile API.
- Verified profile password change rejects an incorrect current password.
- Verified `/profile` and `/technician/tickets` return HTTP 200.
- Verified in the browser that technician navigation shows Tickets, Profile, and Logout only.
- Verified in the browser that `/profile` shows Information and Password forms.

### Route Guard And Navigation Consistency

- Started access-control consistency pass after role-aware navigation.
- Made technician ticket and service report page guards explicit for ADMIN, SUPERVISOR, and TECHNICIAN.
- Made machine log and add machine log page guards explicit for ADMIN, SUPERVISOR, and TECHNICIAN.
- Added role-aware authenticated navigation menu to:
  - Full Machine Log page.
  - Add Service / Upgrade Log page.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted the frontend container.
- Verified in the browser that the technician view on Full Machine Log shows Tickets, Profile, and Logout.
- Verified in the browser that the technician view on Full Machine Log hides Customers and Users.

### Ticket Internal Notes

- Started ticket internal notes feature.
- Added ticket comment create payload.
- Added backend endpoint:
  - `POST /api/tickets/:id/comments`
- Ticket comments default to internal visibility.
- Ticket detail now includes comment author user information.
- Added audit write for `CREATE_TICKET_COMMENT`.
- Added Internal Notes section to the ticket workbench.
- Added note composer for technician/admin/supervisor users.
- Added internal note list with author, visibility, timestamp, and note body.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Created smoke-test internal note `60f59eb2-5256-4e01-96c8-49afccf0af56`.
- Verified ticket detail API returns the smoke-test internal note and technician author.
- Verified in the browser that the ticket workbench shows the Internal Notes section and Add Internal Note button.

### Requester Ticket Conversation

- Started requester-visible ticket conversation feature.
- Added public requester comment payload.
- Added public requester conversation endpoints:
  - `POST /api/public/machines/tickets/:ticketId/comments/list`
  - `POST /api/public/machines/tickets/:ticketId/comments`
- Public requester comment access checks requester phone or email against the ticket before listing or creating comments.
- Requester-created comments are saved as `REQUESTER_VISIBLE`.
- Technician workbench comment composer now supports:
  - internal-only notes.
  - requester-visible replies.
- Renamed ticket workbench notes section to Comments.
- Added Conversation section to the public QR request success screen.
- Requester can submit follow-up comments after creating a ticket.
- Requester conversation only shows requester-visible comments.
- Verified API TypeScript check passes.
- Verified frontend TypeScript check passes.
- Rebuilt and restarted API and frontend containers.
- Created smoke-test ticket `TCK-202606-0014` for requester conversation.
- Verified requester can submit a requester-visible public comment.
- Verified public comment list returns requester-visible requester comments.
- Verified technician can submit a requester-visible reply.
- Verified public comment list returns both requester comment and technician requester-visible reply.
- Verified in the browser that the technician ticket workbench shows the Comments section and visibility selector.
## 2026-06-15 - Machine QR Access Password

- Added per-machine access password storage to support a secured QR entry flow.
- Added public machine access API that validates requester name, phone, optional email, and machine password before issuing a short-lived machine access token.
- Added a requester-facing machine portal route at `/m/[publicId]` with active/closed tickets plus service and upgrade logs.
- Changed generated machine QR links to point at `/m/[publicId]/access`.
- Updated the public ticket request page to require the machine access session and pass the machine token when submitting a ticket.
- Added admin machine form controls to set/reset the machine access password.
- Left the API response shape ready for future WhatsApp/SMS 6-digit OTP verification.
- Rebuilt and restarted API/web Docker containers, applied the Prisma migration, passed API and web type checks, and verified the access API with demo ticket `TCK-202606-0016`.
- Added audit logging for public machine access: password accepted events and machine portal view events now record requester identity, IP address, and user agent in the admin audit log.

## 2026-06-16 - Audit Log Usability

- Added audit log filtering by requester name and entity ID.
- Improved the admin audit log page with action presets for public machine security activity.
- Surfaced requester phone, requester email, IP address, user agent, and ticket counts directly in audit log list/detail views.

## 2026-06-16 - Requester Ticket Tracking

- Added secured public ticket detail API under the machine access session.
- Added requester-visible ticket conversation from the machine portal.
- Added public requester comment posting for any client team member with machine access.
- Linked machine portal active and closed ticket cards to the requester ticket status page.
- Added audit entries for public ticket views and public requester comments.
- Added requester-facing status timeline, ticket attachments, service report attachments, secure machine-token attachment downloads, last-updated display, and current attention indicator.

## 2026-06-16 - Ticket Comment Attachments

- Added `TICKET_COMMENT` attachments so conversation replies can include files.
- Added attachment upload support to technician ticket comments and requester machine-portal ticket comments.
- Added comment attachment display and secure download support in technician and requester ticket views.
- Reused configured request attachment limits for comment uploads.
- Moved the requester ticket conversation section below the service report section.
- Moved submit comment forms below the comments list on both technician and requester ticket pages.
- Grouped requester ticket summary, status timeline, and ticket attachments into one Ticket Status section, keeping Service Reports and Comments as separate sections.

## 2026-06-16 - Service Report Technician Attribution

- Changed service report submission to use the logged-in technician as the report technician.
- Removed the frontend blocker that required a ticket to be assigned before a technician can save a service report.
- Updated requester ticket service report display to show "Submitted by technician" with the technician name.
- Fixed technician access to service report form by allowing technicians to read system settings needed for attachment limits.
- Fixed the service report submit button so technicians can save without ticket assignment.
- Changed service report submission to create a new report each time, allowing multiple service reports per ticket.
- Relaxed ticket status transitions so staff can change from any status to another while still recording status history and audit logs.
- Service report submission now automatically marks the ticket as `RESOLVED` when the report resolution status is `RESOLVED`.
- Added a technician ticket action to regenerate and open an acknowledgement link when a ticket is already `PENDING_ACKNOWLEDGEMENT`.
- Added audit logging for acknowledgement submission and acknowledgement link regeneration without storing the raw public token in audit data.

## 2026-06-16 - Technician Machine List Access

- Allowed technicians to access the full machine list page from the main menu.
- Kept machine create/edit routes restricted to admin and supervisor roles.
- Hid Add Machine and Edit controls from technicians while leaving log and QR access available.

## 2026-06-16 - Requester Ticket Acknowledgement

- Added machine-session protected acknowledgement accept and follow-up endpoints for requester ticket pages.
- Added an Acknowledge Service action on the public ticket status page when the ticket is `PENDING_ACKNOWLEDGEMENT`.
- Embedded the acknowledgement response form into the public ticket page with requester contact fields and drawn signature capture.
- Changed technician pending-acknowledgement action to open the requester ticket page instead of regenerating acknowledgement tokens.
- Moved the requester acknowledgement response form to a separate public ticket acknowledgement page.
- Updated the public ticket status page to link to the acknowledgement page instead of showing the form inline.

## 2026-06-16 - Multi-Technician Ticket Assignment

- Extended ticket assignments with active, lead, and unassignment tracking while preserving assignment history.
- Added API support to assign multiple technicians to one ticket and choose a lead technician.
- Kept `assignedTechnicianId` as the lead technician compatibility field.
- Added assignment audit logging with before and after assigned teams.
- Added technician picker API for ticket assignment by admin and supervisor users.
- Updated the ticket workbench to show assigned teams and let admin/supervisor users edit the team.

## 2026-06-16 - Public Ticket Assigned Technician Display

- Added active ticket assignment team data to the requester-facing ticket status API.
- Updated the public ticket status page to show assigned technician names, including the lead technician marker.

## 2026-06-16 - UI Design Proposal

- Added a UI design proposal covering industrial field-service styling, light/dark theme colors, status colors, layout rules, component rules, and recommended page improvement order.

## 2026-06-17 - Public QR Flow UI Theme Pass

- Added shared field-service UI classes for page shells, panels, inputs, buttons, alerts, links, and status badges.
- Updated the theme selector to match the new industrial service UI direction.
- Applied the new UI style to the machine access page, machine portal page, public request form, public ticket status page, and public acknowledgement page.
- Added consistent ticket status color treatments for requester-facing ticket cards and status pages.

## 2026-06-17 - Staff and Admin UI Theme Pass

- Applied the shared field-service UI style to technician ticket workbench, service report form, profile, machine log, and add-log pages.
- Updated admin dashboard, navigation menu, customers, machines, users, settings, reminders, audit logs, and add/edit forms to use the same panels, controls, alerts, and status badges.
- Kept existing workflows and API behavior unchanged while improving visual consistency across staff pages.

## 2026-06-17 - Service Report Level Acknowledgement

- Changed acknowledgements from one per ticket to one per service report, while keeping a legacy latest acknowledgement field in ticket responses.
- Updated service report submission to create a pending acknowledgement for that technician visit and move the ticket to `PENDING_ACKNOWLEDGEMENT`.
- Added public machine-session endpoints to accept or request follow-up on a specific service report acknowledgement.
- Updated requester ticket pages to show acknowledgement action/status inside each service report card.
- Updated the technician ticket workbench to show acknowledgement status per service report.

## 2026-06-17 - Service Report Signature Display

- Persisted drawn requester signatures as downloadable acknowledgement signature attachments.
- Exposed acknowledgement signature attachment metadata in public and staff ticket detail APIs.
- Allowed public machine-session attachment downloads to include acknowledgement signature files for the same ticket.
- Updated requester and technician service report detail cards to show acknowledgement contact details, comments, service timing, and the drawn signature preview.
- Added missing-file handling for legacy signature metadata so unavailable signature files do not crash the API.

## 2026-06-17 - Public Ticket Timeline Collapse

- Changed the requester ticket status page status timeline to be collapsed by default.
- Added an expandable summary row showing the number of status updates and expand/collapse text.

## 2026-06-17 - Service Report Acknowledgement Detail Collapse

- Moved requester contact details, acknowledgement comment, and signature preview under a collapsed More Info section on the public ticket status service report card.
- Renamed requester signature label to "Acknowledged By" on public and technician service report views.

## 2026-06-17 - Direct Service Report Acknowledgement Link

- Added a technician/admin/supervisor API endpoint to generate a direct public acknowledgement link for a specific service report.
- Updated the token-based public acknowledgement form to display the exact service report attached to the acknowledgement token.
- Added per-service-report direct acknowledgement link generation and copy action in the technician ticket workbench.
- Prevented regenerating direct links for service reports that have already been acknowledged.

## 2026-06-17 - Ticket Workbench Link Wording and Direct Link UX

- Renamed technician workbench actions from "Open Service Report Form" to "Submit Service Report" and "Open Requester Ticket Page" to "Open Ticket Page".
- Changed acknowledgement-link generation to use the logged-in user as the submitter instead of the lead assigned technician.
- Displayed generated direct acknowledgement links inline inside the exact service report card with Open form and Copy link actions.

## 2026-06-17 - Direct Acknowledgement Contact Entry

- Stopped pre-filling requester name, phone, and email on direct acknowledgement links so users enter their own contact details.

## 2026-06-17 - Service Report Submitted Link Page

- Redirected technicians to a submitted confirmation page after saving a service report.
- Added a submitted page that shows the direct acknowledgement link with Copy Link, Open Form, and Back to Ticket Workbench actions.
- Collapsed technician workbench acknowledgement contact details, comments, and signature under a More Info section on service report cards.
- Removed the Open Form action from the submitted page so technicians only copy the direct acknowledgement link.

## 2026-06-17 - Machine Documents

- Added machine document attachments for operation manuals and other machine-related files.
- Added staff upload/list/download support on the full machine log page.
- Exposed machine documents on the public machine portal after QR machine access.
- Added machine-access protected public downloads for machine documents.

## 2026-06-17 - UI Improvement Pass

- Added richer admin dashboard summary cards for open tickets, pending acknowledgements, follow-up items, and upcoming service.
- Added quick ticket filters and a dedicated ticket detail page entry point from the technician workbench.
- Improved service report card summaries with technician, result, and acknowledgement state while keeping details collapsed by default.
- Improved public ticket submission confirmation actions and updated the machine document empty state wording.

## 2026-06-18 - Technician Action Wording

- Renamed the ticket workbench detail action to "Show Ticket Detail".
- Grouped ticket status transition buttons under "Change Ticket Status" inside Technician Actions.

## 2026-06-18 - Visible Attachment Storage

- Changed API uploaded-file storage from the Docker named volume `attachment-data` to the visible host folder `data/uploads`.
- Copied existing uploaded files from `api:/app/uploads` into `D:\Codex\SupportSystem\data\uploads` before remounting.
- Kept database and Redis Docker volumes unchanged.

## 2026-06-18 - Production Test Readiness Docs

- Added `Docs/Backup.md` with database and uploaded-file backup/restore commands.
- Added `Docs/Production-Test-Checklist.md` for admin, requester, technician, acknowledgement, machine log, audit, and rebuild checks.
- Updated `README.md` to document local upload storage and warn against `docker compose down -v` during production testing.

## 2026-06-18 - VPS Deployment Plan

- Added `Docs/VPS-Deployment-Plan.md` for deploying the current production-test version to a VPS.
- Included VPS preparation, firewall, environment secrets, reverse proxy, HTTPS, upload storage, backup, smoke test, and update procedure notes.

## 2026-06-18 - Compose Environment File

- Moved Docker Compose runtime settings and secrets into root `.env`.
- Updated `docker-compose.yml` to read database, JWT, app URL, API URL, and port values from environment variables.
- Updated `.env.example` with production-ready placeholder keys for VPS setup.

## 2026-06-18 - Git Preparation

- Added Git ignore rules to keep `.env`, backups, and uploaded files out of the repository.
- Added `data/uploads/.gitkeep` so the upload folder structure can exist after cloning without committing user files.

## 2026-06-18 - Prisma Seed Command

- Added Prisma seed configuration to the API package so `prisma db seed` runs `prisma/seed-demo-users.js`.
