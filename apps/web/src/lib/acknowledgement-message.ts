type ServiceReportAcknowledgementMessageInput = {
  acknowledgementUrl: string;
  ticketNumber: string;
  customerName: string;
  machineName: string;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  issueTitle: string;
  serviceStartAt?: string | null;
  serviceEndAt?: string | null;
  technicianName?: string | null;
  diagnosis?: string | null;
  actionTaken?: string | null;
  resolutionStatus?: string | null;
  signOffName?: string | null;
};

type MachineLogAcknowledgementMessageInput = {
  acknowledgementUrl: string;
  customerName: string;
  machineName: string;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  activityType: string;
  title: string;
  workDate: string;
  workEndAt?: string | null;
  summary?: string | null;
  signOffName?: string | null;
};

export function buildServiceReportAcknowledgementMessage(input: ServiceReportAcknowledgementMessageInput) {
  return [
    "Dear customer,",
    "",
    "A service report has been submitted for your support ticket. Please review the service details and acknowledge the service rendered using the link below.",
    "",
    `Ticket: ${input.ticketNumber}`,
    `Customer: ${input.customerName}`,
    `Machine: ${input.machineName}`,
    `Model: ${input.model || "Not recorded"}`,
    `Serial No.: ${input.serialNumber || "Not recorded"}`,
    `Location: ${input.location || "Not recorded"}`,
    `Issue: ${input.issueTitle}`,
    `Service Time: ${formatMessageDateRange(input.serviceStartAt, input.serviceEndAt)}`,
    `Technician: ${input.technicianName || "Not recorded"}`,
    `Result: ${formatMessageValue(input.resolutionStatus)}`,
    "",
    "Service Summary:",
    input.actionTaken || input.diagnosis || "Please refer to the service report details in the acknowledgement page.",
    "",
    "Acknowledgement link:",
    input.acknowledgementUrl,
    "",
    "Thank you.",
    input.signOffName || "Tesarax Support"
  ].join("\n");
}

export function buildMachineLogAcknowledgementMessage(input: MachineLogAcknowledgementMessageInput) {
  return [
    "Dear customer,",
    "",
    "A machine activity log is ready for your review. Please acknowledge the activity using the link below.",
    "",
    `Customer: ${input.customerName}`,
    `Machine: ${input.machineName}`,
    `Model: ${input.model || "Not recorded"}`,
    `Serial No.: ${input.serialNumber || "Not recorded"}`,
    `Location: ${input.location || "Not recorded"}`,
    `Activity: ${input.activityType}`,
    `Title: ${input.title}`,
    `Work Time: ${formatMessageDateRange(input.workDate, input.workEndAt)}`,
    "",
    "Summary:",
    input.summary || "Please refer to the machine log details in the acknowledgement page.",
    "",
    "Acknowledgement link:",
    input.acknowledgementUrl,
    "",
    "Thank you.",
    input.signOffName || "Tesarax Support"
  ].join("\n");
}

function formatMessageValue(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Not recorded";
}

function formatMessageDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Not recorded";
  if (!end) return formatMessageDate(start);
  return `${formatMessageDate(start)} to ${formatMessageDate(end)}`;
}

function formatMessageDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
