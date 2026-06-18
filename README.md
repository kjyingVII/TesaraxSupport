# Support System

Machine support system for QR-based service requests, technician ticket handling, service reports, requester acknowledgement, machine logs, and service reminders.

## Planned Stack

- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Storage: Local host folder for production test (`data/uploads`), S3-compatible object storage later
- Queue: Redis + BullMQ

## Workspace

```text
apps/
  web/      Next.js frontend
  api/      NestJS backend
packages/
  shared/   Shared enums and types
Docs/       Planning documents
UserStory/  User stories
TechStack/  Tech stack decisions
```

## Project Log

Meaningful project updates are recorded in:

```text
Logs/project-activity-log.md
```

## Next Setup Step

Install Node.js and pnpm, then run:

```bash
pnpm install
pnpm dev
```

## Docker Development

Docker is the recommended local test setup for this project.

Runtime settings are loaded from:

```text
.env
```

For a new machine, copy `.env.example` to `.env` and update the values.

Start all services:

```bash
docker compose up --build
```

Test endpoints:

```text
Frontend: http://localhost:13000
Backend:  http://localhost:14000/api/health
Database: localhost:5432
Redis:    localhost:6379
```

Stop services:

```bash
docker compose down
```

Remove local database and Redis volumes:

```bash
docker compose down -v
```

Warning: do not run `docker compose down -v` during production testing unless you intentionally want to delete Docker volumes. Uploaded files are stored in `data/uploads`, but the database is stored in the Docker volume `postgres-data`.

## Production Test Docs

```text
Docs/Backup.md
Docs/Production-Test-Checklist.md
```
