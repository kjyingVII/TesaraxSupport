# WhatsApp Message Templates

Use these bodies when creating WhatsApp templates in Twilio Content Templates or Meta WhatsApp Manager.

## Scheduled Task Notification

Template name:

```text
scheduled_task_notification
```

Body:

```text
A service visit has been {{1}}.

Task: {{2}}
Customer: {{3}}
Machine: {{4}}
Schedule Time: {{5}}
Support Company: {{6}}
Contact: {{7}}

Please open the support system for details:
{{8}}

Thank you.
```

System parameters:

```text
{{1}} Schedule action, either "scheduled" or "rescheduled"
{{2}} Task title
{{3}} Customer name
{{4}} Machine name
{{5}} Schedule time
{{6}} Support company
{{7}} Assigned technician contact
{{8}} Machine access link
```

Twilio environment variable:

```text
TWILIO_CONTENT_SID_SCHEDULED_TASK_NOTIFICATION=your_content_sid
```
