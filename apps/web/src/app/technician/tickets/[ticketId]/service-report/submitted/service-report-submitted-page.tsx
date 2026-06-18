"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../../../../../../components/theme-toggle";
import { apiRequest } from "../../../../../../lib/api";
import { getAuthUser } from "../../../../../../lib/auth";

type AcknowledgementLinkResponse = {
  data: {
    acknowledgementUrl: string;
  };
};

export function ServiceReportSubmittedPage({ ticketId, reportId }: { ticketId: string; reportId: string }) {
  const [acknowledgementUrl, setAcknowledgementUrl] = useState("");
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
        setLoading(false);
        return;
      }

      try {
        const user = getAuthUser();
        const response = await apiRequest<AcknowledgementLinkResponse>(
          `/api/service-reports/${reportId}/acknowledgement-link`,
          {
            method: "POST",
            body: JSON.stringify({
              submittedByUserId: user?.id
            })
          }
        );
        if (!mounted) return;
        setAcknowledgementUrl(response.data.acknowledgementUrl);
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
              <div className="mt-4 flex flex-wrap gap-2">
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

function directLinkStorageKey(reportId: string) {
  return `service-report-acknowledgement-link:${reportId}`;
}
