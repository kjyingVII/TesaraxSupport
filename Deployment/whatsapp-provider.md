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
```

Then rebuild and restart the API:

```bash
docker compose up -d --build api
```

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

Meta WhatsApp may require approved message templates for business-initiated notifications outside the customer service window. This first provider implementation sends plain text messages. If Meta rejects a message due to template/window rules, the notification log will show `FAILED` with the provider error.

Template-based sending can be added after the exact production message templates are approved in Meta Business Manager.
