# UI Design Proposal

## Design Direction

Use an Industrial Field Service style with mobile-first requester pages and efficient staff/admin work screens.

The system should feel practical, trustworthy, and easy to use at a machine site. Requesters may use a phone while standing beside equipment, while technicians and admins need faster scanning, filtering, and action-taking.

## Design Principles

- Make current ticket state obvious before details.
- Keep requester pages simple, vertical, and mobile friendly.
- Keep technician pages action-focused with clear next steps.
- Keep admin pages denser, table-oriented, and easy to navigate.
- Support light and dark themes consistently.
- Use status colors consistently across all pages.
- Avoid decorative layouts that slow down daily service work.

## Recommended Visual Style

### Light Theme

- Page background: `#f6f7f8`
- Surface/card background: `#ffffff`
- Primary text: `#171717`
- Secondary text: `#5f6368`
- Border: `#d9dee3`
- Primary action: `#155e75`
- Primary action hover: `#0e4f63`
- Positive action: `#166534`
- Warning: `#b45309`
- Danger: `#b91c1c`

### Dark Theme

- Page background: `#0f1115`
- Surface/card background: `#171a21`
- Elevated surface: `#1f242d`
- Primary text: `#f5f7fa`
- Secondary text: `#a8b0ba`
- Border: `#2f3742`
- Primary action: `#22d3ee`
- Primary action hover: `#67e8f9`
- Positive action: `#4ade80`
- Warning: `#fbbf24`
- Danger: `#f87171`

## Status Colors

- `NEW`: neutral gray
- `ASSIGNED`: blue
- `IN_PROGRESS`: cyan
- `WAITING_FOR_REQUESTER`: amber
- `WAITING_FOR_PARTS`: orange
- `PENDING_ACKNOWLEDGEMENT`: emerald
- `FOLLOW_UP_REQUIRED`: violet
- `RESOLVED`: green
- `CLOSED`: neutral dark/gray

Status badges should use the same color rules on requester, technician, and admin pages.

## Typography

- Use the existing system font stack unless a design system is introduced later.
- Page title: 24-30px, semibold
- Section title: 18-20px, semibold
- Card title: 15-16px, semibold
- Body text: 14-16px
- Metadata and helper text: 12-13px

Do not use oversized headings inside compact cards, tables, or forms.

## Layout Rules

### Requester / Public Pages

- Mobile-first single column.
- Machine identity should appear near the top.
- Show active tickets before closed logs.
- Use large touch targets for buttons.
- Use grouped sections:
  - Machine Summary
  - Active Tickets
  - Closed Tickets
  - Service Log
  - Upgrade Log
- Ticket status page should keep these groups:
  - Ticket Status
  - Service Reports
  - Comments
  - Service Acknowledgement when available

### Technician Pages

- Main ticket list should be quick to scan.
- Ticket cards should show:
  - ticket number
  - status
  - priority
  - customer/machine
  - assigned team
  - last update
- Ticket detail should keep actions near the top.
- Service report should remain on a separate page.
- Comments should stay below service reports.

### Admin Pages

- Use a consistent admin shell with:
  - top or side navigation
  - breadcrumb starting from `Home`
  - page title and primary action
- List pages should support tables on desktop and stacked cards on mobile.
- Add and edit forms should be separate pages.
- Settings and audit pages should be compact and readable.

## Component Style

### Buttons

- Primary button: filled accent background.
- Secondary button: border style.
- Danger button: red tone, only for destructive actions.
- Icon buttons should use icons where available.
- Minimum height: 40px desktop, 44px mobile.

### Cards

- Border radius: 8px maximum.
- Use cards for ticket items, reports, comments, and form panels.
- Do not nest cards inside cards.
- Avoid heavy shadows; use borders and subtle background contrast.

### Forms

- Labels above inputs.
- Inputs at least 44px high on mobile.
- Use clear validation messages near the field or form.
- File upload areas should show size limits and selected files.
- Signature field should stay as a drawing canvas, not text input.

### Tables

- Desktop admin pages can use tables.
- Mobile should convert to stacked rows/cards.
- Keep row actions visible but compact.

## Page Improvement Order

1. Public machine access and machine portal pages.
2. Public ticket status and acknowledgement pages.
3. Technician ticket workbench.
4. Technician service report form.
5. Admin dashboard and main navigation.
6. Admin customers, machines, users, tickets, settings.
7. Audit log page.

## First UI Editing Target

Start with the public/requester pages because they are the first production-test touchpoint:

- `/m/[publicId]/access`
- `/m/[publicId]`
- `/m/[publicId]/tickets/[ticketId]`
- `/request/[publicId]`

This gives the QR scan flow a polished first impression without changing core system logic.

