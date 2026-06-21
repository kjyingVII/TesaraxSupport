# WhatsApp Provider Setup

The system can send WhatsApp notifications through either Twilio WhatsApp or Meta WhatsApp Cloud API.

By default, WhatsApp is in log-only mode:

```env
WHATSAPP_PROVIDER=log
```

In log-only mode, notification attempts are saved in Admin > Notifications with status `SKIPPED`.

## Enable Twilio WhatsApp

Twilio can be used while Meta app review is still pending. Set these values in `.env`:

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_STATUS_CALLBACK_URL=https://supportapi.tesarax.cloud/api/webhooks/twilio/whatsapp/status
```

For Twilio Sandbox testing, `TWILIO_WHATSAPP_FROM` is normally:

```env
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

The receiving phone number must join your Twilio WhatsApp Sandbox before sandbox messages can arrive.

Then rebuild and restart the API:

```bash
docker compose up -d --build api
```

Test from Admin > Notifications using the Manual WhatsApp Test form.

## Twilio Status Callback Endpoint

Use this status callback URL in Twilio, or set it in `.env` as shown above:

```text
https://supportapi.tesarax.cloud/api/webhooks/twilio/whatsapp/status
```

Twilio status callbacks are stored in `WhatsAppWebhookEvent` with provider `twilio`. Matching Admin > Notifications rows are updated by Twilio message SID.

## Enable Meta WhatsApp Cloud API

Set these values in `.env`:

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_META_GRAPH_API_VERSION=v20.0
WHATSAPP_META_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_META_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_META_WEBHOOK_VERIFY_TOKEN=your_own_random_verify_token
WHATSAPP_META_APP_SECRET=your_meta_app_secret
WHATSAPP_META_MESSAGE_MODE=text
```

Then rebuild and restart the API:

```bash
docker compose up -d --build api
```

## Meta Webhook Endpoint

Use this callback URL in Meta Business Manager:

```text
https://supportapi.tesarax.cloud/api/webhooks/meta/whatsapp
```

Use the same verify token that you set in `.env`:

```env
WHATSAPP_META_WEBHOOK_VERIFY_TOKEN=your_own_random_verify_token
```

The endpoint supports:

- `GET /api/webhooks/meta/whatsapp`: Meta webhook verification
- `POST /api/webhooks/meta/whatsapp`: WhatsApp callback events

Incoming webhook events are stored in the database table `WhatsAppWebhookEvent`. Delivery status callbacks also update matching Admin > Notifications rows by Meta message ID.

For stronger production security, set:

```env
WHATSAPP_META_APP_SECRET=your_meta_app_secret
```

When `WHATSAPP_META_APP_SECRET` is set, the API verifies Meta's `x-hub-signature-256` header and rejects unsigned or invalid webhook callbacks.

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
