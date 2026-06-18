# Requester User Stories

## Role

The requester is the client user who discovers an issue at the machine and submits a support request by scanning the machine QR code.

## Main Goals

- Scan a QR code at the machine.
- Submit contact information and issue details.
- Upload photos or files showing the issue.
- Receive a ticket confirmation.
- Log or confirm completed service or upgrade work when allowed.
- Review the technician's solution.
- Acknowledge the completed service with a digital signature.
- Request follow-up if the issue is not resolved.

## User Stories

### US-003: Open Request Form From QR Code

As a requester, I want to scan the QR code on a machine so that I can report a problem without searching for machine details manually.

Acceptance criteria:

- Scanning the QR code opens the request form in a browser.
- The form displays key machine information, such as machine name, model, serial number, and location.
- The requester does not need to log in to submit a basic request, unless the business later requires authentication.
- The request form layout is mobile phone friendly.

### US-004: Submit Requester Information

As a requester, I want to enter my contact information so that the technician can contact me about the service request.

Acceptance criteria:

- Requester can enter name, company, department, phone number, and email.
- Required fields are clearly marked.
- System validates email and phone number format where practical.
- Requester can submit the form from a mobile device.
- Input fields and buttons are easy to use on a touch screen.

### US-005: Submit Issue Details

As a requester, I want to describe the machine issue so that the technician understands what needs to be fixed.

Acceptance criteria:

- Requester can enter issue title and detailed description.
- Requester can select issue category, such as breakdown, abnormal sound, quality issue, preventive maintenance, or other.
- Requester can select priority, such as low, normal, urgent, or machine down.
- System records submission date and time automatically.

### US-006: Upload Request Attachments

As a requester, I want to upload photos or files so that I can show the machine problem clearly.

Acceptance criteria:

- Requester can upload one or more attachments.
- Supported files include common image formats and PDF.
- System limits file size based on configured rules.
- Attachments are stored with the ticket.

### US-007: Receive Ticket Confirmation

As a requester, I want to receive confirmation after submission so that I know my request was successfully recorded.

Acceptance criteria:

- System displays a ticket number after submission.
- System can send confirmation by email or SMS if contact details are provided and notification service is enabled.
- Confirmation includes ticket number, machine details, and submitted issue summary.

### US-016: Review Completed Service

As a requester, I want to review the technician's report so that I can verify the completed work.

Acceptance criteria:

- Requester can open the acknowledgement page from a secure ticket link.
- Requester can view machine details, original request, technician report, and technician attachments.
- Requester can accept the solution or request follow-up.

### US-017: Sign and Confirm Service

As a requester, I want to sign digitally and confirm the service rendered so that the ticket can be officially closed.

Acceptance criteria:

- Requester can provide name, acknowledgement date/time, and digital signature.
- Signature can be captured using touch or mouse.
- System prevents confirmation without required acknowledgement information.
- After confirmation, ticket status changes to Closed.
- System stores acknowledgement details with the ticket.
- Signature capture works comfortably on mobile phone screens.

### US-018: Request Follow-Up

As a requester, I want to reject or request follow-up if the issue is not resolved so that the technician can continue working on the ticket.

Acceptance criteria:

- Requester can select "Request Follow-Up" instead of signing acceptance.
- Requester must provide a reason or comment.
- Ticket status changes back to In Progress or Follow-Up Required.
- Technician and/or supervisor is notified if notification is enabled.

### US-023: Log or Confirm Machine Service

As a requester, I want to log or confirm that a service or upgrade was done so that the machine's service history stays accurate.

Acceptance criteria:

- Requester can access service confirmation from a secure link or allowed QR flow.
- Requester can confirm completed service or upgrade details.
- Requester can provide name, date, remarks, and optional attachment.
- System records requester confirmation in the machine service history.
- If the log is a service, system updates the machine's service reminder schedule.
