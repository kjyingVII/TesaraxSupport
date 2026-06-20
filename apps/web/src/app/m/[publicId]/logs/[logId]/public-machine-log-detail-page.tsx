"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiRequest } from "../../../../../lib/api";
import { getMachineAccessSession } from "../../../../../lib/machine-access";

type ActivityType =
  | "CORRECTIVE_SERVICE"
  | "MACHINE_MAINTENANCE"
  | "COMPONENT_REPLACEMENT"
  | "INSPECTION_DIAGNOSIS"
  | "UPGRADE"
  | "OTHER";

type LogDetail = {
  id: string;
  activityType: ActivityType;
  workDate: string;
  workEndAt: string | null;
  title: string;
  workSummary: string;
  partsUsed: string | null;
  upgradeVersion: string | null;
  upgradeDescription: string | null;
  nextServiceDueOverrideAt: string | null;
  requesterConfirmedName: string | null;
  requesterContactPhone: string | null;
  requesterContactEmail: string | null;
  requesterAcknowledgementRequired: boolean;
  requesterConfirmedAt: string | null;
  loggedByRequesterName: string | null;
  createdAt: string;
  ticket: {
    id: string;
    ticketNumber: string;
    issueTitle: string;
    status: string;
  } | null;
  serviceReport: {
    id: string;
    diagnosis: string;
    actionTaken: string;
    resolutionStatus: string;
  } | null;
  attachments: Array<{
    id: string;
    originalFileName: string;
    contentType: string;
    fileSizeBytes: number;
    uploadedByRequesterName: string | null;
    createdAt: string;
  }>;
};

type LogDetailResponse = {
  data: LogDetail;
};

export function PublicMachineLogDetailPage({ publicId, logId }: { publicId: string; logId: string }) {
  const router = useRouter();
  const [log, setLog] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLog() {
      const session = getMachineAccessSession(publicId);
      if (!session) {
        router.replace(`/m/${publicId}/access`);
        return;
      }

      try {
        const response = await apiRequest<LogDetailResponse>(`/api/public/machines/${publicId}/logs/${logId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        });
        if (!mounted) return;
        setLog(response.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load machine log.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadLog();

    return () => {
      mounted = false;
    };
  }, [publicId, logId, router]);

  return (
    <main className="field-page">
      <section className="field-shell max-w-3xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Machine Activity</p>
            <h1 className="field-title">Machine Log Detail</h1>
          </div>
          <ThemeToggle />
        </header>

        {loading ? (
          <section className="field-panel mt-6">
            <p className="field-muted">Loading machine log...</p>
          </section>
        ) : null}

        {error ? (
          <section className="field-alert-error mt-6">
            <p>{error}</p>
            <Link className="field-button-secondary mt-4" href={`/m/${publicId}`}>
              Back to Machine Page
            </Link>
          </section>
        ) : null}

        {log ? (
          <>
            <section className="field-panel mt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="field-eyebrow">{activityTypeLabel(log.activityType)}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{log.title}</h2>
                </div>
                <Link className="field-button-secondary" href={`/m/${publicId}`}>
                  Back
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailLine label="Work Time" value={formatDateTime(log.workDate)} />
                <DetailLine label="End Time" value={log.workEndAt ? formatDateTime(log.workEndAt) : "Not recorded"} />
              </div>
            </section>

            <section className="field-panel mt-5">
              <h2 className="field-section-title">Details</h2>
              <div className="mt-4 grid gap-4">
                <DetailLine label="Summary" value={log.workSummary} multiline />
                <DetailLine label="Parts Used" value={log.partsUsed || "None recorded"} />
                {log.activityType === "UPGRADE" ? (
                  <>
                    <DetailLine label="Upgrade Version" value={log.upgradeVersion || "Not recorded"} />
                    <DetailLine label="Upgrade Description" value={log.upgradeDescription || "Not recorded"} multiline />
                  </>
                ) : null}
                {log.activityType === "MACHINE_MAINTENANCE" ? (
                  <DetailLine
                    label="Next Machine Maintenance Override"
                    value={log.nextServiceDueOverrideAt ? formatDateTime(log.nextServiceDueOverrideAt) : "None"}
                  />
                ) : null}
              </div>
            </section>

            <section className="field-panel mt-5">
              <h2 className="field-section-title">Logged By</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailLine label="Name" value={log.requesterConfirmedName || "Not recorded"} />
                <DetailLine label="Contact Number" value={log.requesterContactPhone || "Not recorded"} />
                <DetailLine label="Email" value={log.requesterContactEmail || "Not recorded"} />
                <DetailLine label="Requester Acknowledgement Required" value={log.requesterAcknowledgementRequired ? "Yes" : "No"} />
                <DetailLine label="Logged By" value={log.loggedByRequesterName || log.requesterConfirmedName || "Not recorded"} />
              </div>
            </section>

            {log.ticket || log.serviceReport ? (
              <section className="field-panel mt-5">
                <h2 className="field-section-title">Related Records</h2>
                <div className="mt-4 grid gap-4">
                  {log.ticket ? <DetailLine label="Ticket" value={`${log.ticket.ticketNumber} / ${log.ticket.issueTitle} / ${log.ticket.status}`} /> : null}
                  {log.serviceReport ? (
                    <>
                      <DetailLine label="Service Report Diagnosis" value={log.serviceReport.diagnosis} multiline />
                      <DetailLine label="Service Report Action" value={log.serviceReport.actionTaken} multiline />
                      <DetailLine label="Service Report Result" value={log.serviceReport.resolutionStatus} />
                    </>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="field-panel mt-5">
              <h2 className="field-section-title">Attachments</h2>
              <div className="mt-4 grid gap-3">
                {log.attachments.length > 0 ? (
                  log.attachments.map((attachment) => (
                    <div key={attachment.id} className="field-panel-subtle text-sm">
                      <p className="font-medium">{attachment.originalFileName}</p>
                      <p className="field-muted mt-1">
                        {formatBytes(attachment.fileSizeBytes)} / Uploaded {formatDateTime(attachment.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="field-muted">No attachments.</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function DetailLine({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="field-meta-label">{label}</p>
      <p className={`mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200 ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function activityTypeLabel(value: ActivityType) {
  switch (value) {
    case "MACHINE_MAINTENANCE":
      return "Machine Maintenance";
    case "COMPONENT_REPLACEMENT":
      return "Component Replacement";
    case "INSPECTION_DIAGNOSIS":
      return "Inspection / Diagnosis";
    case "UPGRADE":
      return "Upgrade";
    case "OTHER":
      return "Other";
    case "CORRECTIVE_SERVICE":
    default:
      return "Corrective Service";
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
