# Production Test Checklist

Use this checklist before testing with a real client.

## Before Testing

- Confirm containers are running:

```powershell
docker compose ps
```

- Confirm frontend opens:

```text
http://localhost:13000
```

- Confirm backend health:

```text
http://localhost:14000/api/health
```

- Confirm uploaded files folder exists:

```text
D:\Codex\SupportSystem\data\uploads
```

- Run a database and uploads backup using `Docs/Backup.md`.

## Admin Flow

- Log in as admin.
- Create or edit customer.
- Create or edit machine.
- Set machine service reminder interval.
- Confirm machine QR/access link works.
- Upload at least one machine document/manual.
- Confirm uploaded file appears in `data/uploads`.

## Requester QR Flow

- Open machine access page from QR/public machine link.
- Enter machine password.
- Enter requester name and contact number.
- Confirm machine page shows:
  - machine information
  - active tickets
  - closed tickets
  - service logs
  - upgrade logs
  - machine documents
- Submit a new ticket with attachment.
- Confirm request submission page shows ticket number and status link.

## Technician Flow

- Log in as technician.
- Open Ticket Workbench.
- Use quick filters.
- Open selected ticket.
- Click Show Ticket Detail.
- Submit service report.
- Select service outcome:
  - not resolved
  - partially resolved
  - resolved
- Upload service report attachment.
- Confirm submitted page shows direct acknowledgement link.

## Acknowledgement Flow

- Open direct acknowledgement link.
- Confirm requester name, phone, and email are empty for user entry.
- Draw signature.
- Submit acknowledgement.
- Confirm service report shows acknowledgement details.
- If service report is resolved, confirm ticket closes after acknowledgement.
- If service report is not resolved or partially resolved, confirm follow-up is required.

## Machine Log Flow

- Open full machine log page.
- Add service log.
- Add upgrade log.
- Include contact number and email.
- Confirm service, upgrade, and ticket logs are clickable.

## Audit and Data Checks

- Open audit logs.
- Confirm important actions are logged:
  - machine access
  - ticket status changes
  - service report submission
  - acknowledgement
  - admin changes
- Confirm uploaded files remain after:

```powershell
docker compose up -d --build web
docker compose up -d --build api
```

## Pass Criteria

- Requester can scan QR and submit ticket.
- Technician can submit service report.
- Requester can acknowledge each service visit.
- Admin can manage customer, machine, user, settings, and audit logs.
- Uploaded files survive web/API rebuild.
- Database backup and upload backup can be created.
