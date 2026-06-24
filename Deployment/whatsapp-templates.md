# WhatsApp Message Templates

Use these bodies when creating WhatsApp templates in Twilio Content Templates or Meta WhatsApp Manager.

## Scheduled Task Created

Template name:

```text
scheduled_task_created_notification
```

Body:

```text
A service visit has been scheduled.

Task: {{1}}
Customer: {{2}}
Machine: {{3}}
Serial No.: {{4}}
Schedule Time: {{5}}
Assigned Staff: {{6}}
Support Company: {{7}}

Please open the support system for details:
{{8}}

Thank you.
```

System parameters:

```text
{{1}} Task title
{{2}} Customer name
{{3}} Machine name
{{4}} Machine serial number
{{5}} Schedule time
{{6}} Assigned staff
{{7}} Support company
{{8}} Machine access link
```

Twilio environment variable:

```text
TWILIO_CONTENT_SID_SCHEDULED_TASK_CREATED=your_content_sid
```

## Scheduled Task Rescheduled

Template name:

```text
scheduled_task_rescheduled_notification
```

Body:

```text
A service visit has been rescheduled.

Task: {{1}}
Customer: {{2}}
Machine: {{3}}
Serial No.: {{4}}
Schedule Time: {{5}}
Assigned Staff: {{6}}
Support Company: {{7}}

Please open the support system for details:
{{8}}

Thank you.
```

System parameters:

```text
{{1}} Task title
{{2}} Customer name
{{3}} Machine name
{{4}} Machine serial number
{{5}} Schedule time
{{6}} Assigned staff
{{7}} Support company
{{8}} Machine access link
```

Twilio environment variable:

```text
TWILIO_CONTENT_SID_SCHEDULED_TASK_RESCHEDULED=your_content_sid
```

