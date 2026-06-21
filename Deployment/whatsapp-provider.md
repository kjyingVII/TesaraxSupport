# WhatsApp Provider Setup

The system can send WhatsApp notifications through Meta WhatsApp Cloud API.

By default, WhatsApp is in log-only mode:

```env
WHATSAPP_PROVIDER=log
```

In log-only mode, notification attempts are saved in Admin > Notifications with status `SKIPPED`.

## Enable Meta WhatsApp Cloud API

Set these values in `.env`:

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_META_GRAPH_API_VERSION=v20.0
WHATSAPP_META_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_META_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_META_MESSAGE_MODE=text
```

Then rebuild and restart the API:

```bash
docker compose up -d --build api
```

## Message Mode

For first testing, use plain text mode:

```env
WHATSAPP_META_MESSAGE_MODE=text
```

Plain text is useful for confirming credentials, phone number formatting, and notification logs. In production, Meta may reject business-initiated plain text messages outside the WhatsApp customer service window. For production alerts, use template mode after the templates are approved in Meta Business Manager:

```env
WHATSAPP_META_MESSAGE_MODE=template
WHATSAPP_META_TEMPLATE_LANGUAGE=en
WHATSAPP_META_TEMPLATE_TICKET_CREATED_REQUESTER=your_ticket_created_requester_template
WHATSAPP_META_TEMPLATE_TICKET_CREATED_TECHNICIAN=your_ticket_created_technician_template
WHATSAPP_META_TEMPLATE_TICKET_STATUS_CHANGED=your_ticket_status_changed_template
WHATSAPP_META_TEMPLATE_SERVICE_REPORT_SUBMITTED=your_service_report_submitted_template
WHATSAPP_META_TEMPLATE_MACHINE_LOG_CREATED=your_machine_log_created_template
```

If template mode is enabled but a matching template name is missing, the notification attempt is saved as `SKIPPED` in Admin > Notifications.

## Suggested Meta Templates

Create these templates in Meta Business Manager with body variables in this exact order.

### Ticket Created - Requester

Template env key:

```env
WHATSAPP_META_TEMPLATE_TICKET_CREATED_REQUESTER=
```

Suggested body:

```text
Ticket {{1}} has been submitted for machine {{2}} ({{3}}). Issue: {{4}}. Our support team will review and update the ticket status.
```

Variables:

- `{{1}}` ticket number
- `{{2}}` machine name
- `{{3}}` serial number
- `{{4}}` issue title

### Ticket Created - Technician

Template env key:

```env
WHATSAPP_META_TEMPLATE_TICKET_CREATED_TECHNICIAN=
```

Suggested body:

```text
New support ticket {{1}} was lodged. Customer: {{2}}. Machine: {{3}}. Priority: {{4}}. Issue: {{5}}.
```

Variables:

- `{{1}}` ticket number
- `{{2}}` customer name
- `{{3}}` machine name
- `{{4}}` priority
- `{{5}}` issue title

### Ticket Status Changed

Template env key:

```env
WHATSAPP_META_TEMPLATE_TICKET_STATUS_CHANGED=
```

Suggested body:

```text
Ticket {{1}} status changed from {{2}} to {{3}}. Machine: {{4}}. Issue: {{5}}.
```

Variables:

- `{{1}}` ticket number
- `{{2}}` previous status
- `{{3}}` new status
- `{{4}}` machine name
- `{{5}}` issue title

### Service Report Submitted

Template env key:

```env
WHATSAPP_META_TEMPLATE_SERVICE_REPORT_SUBMITTED=
```

Suggested body:

```text
A service report has been submitted for ticket {{1}}. Technician: {{2}}. Machine: {{3}}. Result: {{4}}. Please review and acknowledge the service report.
```

Variables:

- `{{1}}` ticket number
- `{{2}}` technician name
- `{{3}}` machine name
- `{{4}}` resolution status

### Machine Log Created

Template env key:

```env
WHATSAPP_META_TEMPLATE_MACHINE_LOG_CREATED=
```

Suggested body:

```text
A machine log has been added for {{1}} ({{2}}). Type: {{3}}. Title: {{4}}. Work time: {{5}}.
```

Variables:

- `{{1}}` machine name
- `{{2}}` serial number
- `{{3}}` activity type
- `{{4}}` title
- `{{5}}` work time

## What Gets Sent

The existing notification events will send WhatsApp messages when provider credentials are configured:

- ticket lodged: requester, machine technicians, customer technicians
- ticket status changed: requester
- service report submitted: requester
- machine log created with Notify Customer enabled: selected notify recipient

Each attempt is recorded in Admin > Notifications:

- `SENT`: provider accepted the message
- `FAILED`: provider returned an error or network send failed
- `SKIPPED`: no phone number or provider not configured

## Important Production Note

Meta WhatsApp may require approved message templates for business-initiated notifications outside the customer service window. If plain text mode is rejected by Meta, the notification log will show `FAILED` with the provider error. Switch to template mode after the production templates are approved.
