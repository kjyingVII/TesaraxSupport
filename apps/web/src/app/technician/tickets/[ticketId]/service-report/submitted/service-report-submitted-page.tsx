"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../../../../../../components/theme-toggle";
import { buildServiceReportAcknowledgementMessage } from "../../../../../../lib/acknowledgement-message";
import { apiRequest } from "../../../../../../lib/api";
import { getAuthUser } from "../../../../../../lib/auth";

type AcknowledgementLinkResponse = {
  data: {
    acknowledgementUrl: string;
  };
};

type TicketDetailResponse = {
  data: {
    ticketNumber: string;
    issueTitle: string;
    machine: {
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      supportCompanyName: string | null;
      customer: {
        name: string;
      };
    };
    serviceReports: Array<{
      id: string;
      diagnosis: string;
      actionTaken: string;
      resolutionStatus: string;
      serviceStartAt: string;
      serviceEndAt: string;
      technician?: {
        name: string;
      };
    }>;
  };
};

type SettingsResponse = {
  data: {
    companyName: string | null;
  };
};

export function ServiceReportSubmittedPage({ ticketId, reportId }: { ticketId: string; reportId: string }) {
  const [acknowledgementUrl, setAcknowledgementUrl] = useState("");
  const [acknowledgementMessage, setAcknowledgementMessage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadLink() {
      if (!reportId) {
        setError("Service report id is missing.");
        setLoading(false);
        return;
      }

      const stored = window.sessionStorage.getItem(directLinkStorageKey(reportId));
      if (stored) {
        setAcknowledgementUrl(stored);
        try {
          const [ticketResponse, settingsResponse] = await Promise.all([
            apiRequest<TicketDetailResponse>(`/api/tickets/${ticketId}`),
            loadSignOffSettings()
          ]);
          if (!mounted) return;
          setAcknowledgementMessage(buildServiceReportMessage(stored, ticketResponse.data, reportId, settingsResponse.data.companyName));
        } catch (err) {
          if (!mounted) return;
          setError(err instanceof Error ? err.message : "Unable to prepare acknowledgement message.");
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }

      try {
        const user = getAuthUser();
        const [response, ticketResponse, settingsResponse] = await Promise.all([
          apiRequest<AcknowledgementLinkResponse>(
            `/api/service-reports/${reportId}/acknowledgement-link`,
            {
              method: "POST",
              body: JSON.stringify({
                submittedByUserId: user?.id
              })
            }
          ),
          apiRequest<TicketDetailResponse>(`/api/tickets/${ticketId}`),
          loadSignOffSettings()
        ]);
        if (!mounted) return;
        setAcknowledgementUrl(response.data.acknowledgementUrl);
        setAcknowledgementMessage(buildServiceReportMessage(response.data.acknowledgementUrl, ticketResponse.data, reportId, settingsResponse.data.companyName));
        window.sessionStorage.setItem(directLinkStorageKey(reportId), response.data.acknowledgementUrl);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to prepare acknowledgement link.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadLink();

    return () => {
      mounted = false;
    };
  }, [reportId]);

  async function copyLink() {
    if (!acknowledgementUrl) return;

    try {
      await navigator.clipboard.writeText(acknowledgementUrl);
      setMessage("Acknowledgement link copied.");
    } catch {
      setMessage("Copy failed. Select and copy the link manually.");
    }
  }

  async function copyMessage() {
    if (!acknowledgementMessage) return;

    try {
      await navigator.clipboard.writeText(acknowledgementMessage);
      setMessage("Acknowledgement message copied.");
    } catch {
      setMessage("Copy failed. Select and copy the message manually.");
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-3xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Technician</p>
            <h1 className="field-title">Service Report Submitted</h1>
          </div>
          <ThemeToggle />
        </header>

        <section className="field-panel mt-6">
          <h2 className="field-section-title">Direct Acknowledgement Link</h2>
          <p className="field-muted mt-3">
            Send this link to the requester so they can acknowledge this service visit directly.
          </p>

          {loading ? <p className="field-muted mt-5">Preparing link...</p> : null}

          {error ? (
            <div className="field-alert-error mt-5">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="field-alert-success mt-5">
              {message}
            </div>
          ) : null}

          {acknowledgementUrl ? (
            <div className="field-panel-subtle mt-5 text-sm">
              <p className="field-meta-label">Link</p>
              <p className="mt-2 break-all font-medium text-neutral-800 dark:text-neutral-100">{acknowledgementUrl}</p>
              {acknowledgementMessage ? (
                <>
                  <p className="field-meta-label mt-4">Ready Message</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md border border-[#d9dee3] bg-white p-3 text-sm leading-6 text-neutral-800 dark:border-[#2f3742] dark:bg-[#0f1115] dark:text-neutral-100">
                    {acknowledgementMessage}
                  </pre>
                </>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="field-button-primary" type="button" onClick={copyMessage}>
                  Copy Message
                </button>
                <button className="field-button-primary" type="button" onClick={copyLink}>
                  Copy Link
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-5">
          <Link className="field-button-secondary inline-flex min-h-11 items-center" href="/technician/tickets">
            Back to Ticket Workbench
          </Link>
        </div>
      </section>
    </main>
  );
}

async function loadSignOffSettings(): Promise<SettingsResponse> {
  try {
    return await apiRequest<SettingsResponse>("/api/settings");
  } catch {
    return { data: { companyName: null } };
  }
}

function directLinkStorageKey(reportId: string) {
  return `service-report-acknowledgement-link:${reportId}`;
}

function buildServiceReportMessage(
  acknowledgementUrl: string,
  ticket: TicketDetailResponse["data"],
  reportId: string,
  defaultSignOffName?: string | null
) {
  const report = ticket.serviceReports.find((item) => item.id === reportId) ?? ticket.serviceReports[0];

  return buildServiceReportAcknowledgementMessage({
    acknowledgementUrl,
    ticketNumber: ticket.ticketNumber,
    customerName: ticket.machine.customer.name,
    machineName: ticket.machine.machineName,
    model: ticket.machine.model,
    serialNumber: ticket.machine.serialNumber,
    location: ticket.machine.location,
    issueTitle: ticket.issueTitle,
    serviceStartAt: report?.serviceStartAt,
    serviceEndAt: report?.serviceEndAt,
    technicianName: report?.technician?.name,
    diagnosis: report?.diagnosis,
    actionTaken: report?.actionTaken,
    resolutionStatus: report?.resolutionStatus,
    signOffName: ticket.machine.supportCompanyName || defaultSignOffName
  });
}
