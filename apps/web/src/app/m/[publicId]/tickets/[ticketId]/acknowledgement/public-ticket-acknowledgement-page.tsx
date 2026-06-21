"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PhoneNumberInput } from "../../../../../../components/phone-number-input";
import { ThemeToggle } from "../../../../../../components/theme-toggle";
import { apiRequest } from "../../../../../../lib/api";
import { getMachineAccessSession } from "../../../../../../lib/machine-access";

type ServiceReport = {
  id: string;
  diagnosis: string;
  actionTaken: string;
  partsUsed: string | null;
  recommendations: string | null;
  resolutionStatus: string;
  serviceStartAt: string;
  serviceEndAt: string;
  technician: {
    name: string;
    email: string;
  };
  acknowledgement: {
    id: string;
    serviceReportId: string | null;
    response: string | null;
    requesterName: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    requesterComment: string | null;
    acknowledgedAt: string | null;
    tokenExpiresAt: string;
  } | null;
};

type PublicTicketResponse = {
  data: {
    id: string;
    ticketNumber: string;
    requesterName: string;
    requesterPhone: string | null;
    requesterEmail: string | null;
    issueTitle: string;
    issueDescription: string;
    priority: string;
    status: string;
    machine: {
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customerName: string;
    };
    serviceReports: ServiceReport[];
    acknowledgement: ServiceReport["acknowledgement"];
  };
};

type SubmitResponse = {
  data: {
    response: string;
    requesterName: string | null;
    acknowledgedAt: string | null;
  };
};

type ActionMode = "accept" | "follow-up";

export function PublicTicketAcknowledgementPage({
  publicId,
  ticketId,
  serviceReportId
}: {
  publicId: string;
  ticketId: string;
  serviceReportId?: string;
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState<PublicTicketResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse["data"] | null>(null);
  const [mode, setMode] = useState<ActionMode>("accept");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [comment, setComment] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    void loadTicket();
  }, [publicId, ticketId]);

  async function loadTicket() {
    const session = getMachineAccessSession(publicId);
    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    setRequesterName((current) => current || session.requesterName);
    setRequesterPhone((current) => current || session.requesterPhone);
    setRequesterEmail((current) => current || session.requesterEmail || "");
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<PublicTicketResponse>(`/api/public/machines/${publicId}/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });
      setTicket(response.data);
      const targetReport = serviceReportId
        ? response.data.serviceReports.find((report) => report.id === serviceReportId)
        : response.data.serviceReports.find((report) => report.acknowledgement && !report.acknowledgement.response) ?? response.data.serviceReports[0];
      setRequesterName((current) => current || targetReport?.acknowledgement?.requesterName || response.data.requesterName || "");
      setRequesterPhone((current) => current || targetReport?.acknowledgement?.requesterPhone || response.data.requesterPhone || "");
      setRequesterEmail((current) => current || targetReport?.acknowledgement?.requesterEmail || response.data.requesterEmail || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load acknowledgement.");
    } finally {
      setLoading(false);
    }
  }

  const targetReport = ticket
    ? serviceReportId
      ? ticket.serviceReports.find((report) => report.id === serviceReportId) ?? null
      : ticket.serviceReports.find((report) => report.acknowledgement && !report.acknowledgement.response) ?? ticket.serviceReports[0] ?? null
    : null;
  const targetAcknowledgement = targetReport?.acknowledgement ?? null;
  const isPending = ticket?.status === "PENDING_ACKNOWLEDGEMENT" && targetAcknowledgement !== null && !targetAcknowledgement.response;

  const canSubmit = useMemo(() => {
    if (!requesterName.trim() || !requesterPhone.trim() || !isPending) return false;
    if (mode === "accept") return Boolean(signature.trim());
    return Boolean(comment.trim());
  }, [comment, isPending, mode, requesterName, requesterPhone, signature]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getMachineAccessSession(publicId);
    if (!session || !ticket) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    setError(null);
    setSubmitting(true);
    setResult(null);

    try {
      const reportPath = targetReport
        ? `/api/public/machines/${publicId}/tickets/${ticketId}/service-reports/${targetReport.id}/acknowledgement`
        : `/api/public/machines/${publicId}/tickets/${ticketId}/acknowledgement`;
      const path = mode === "accept" ? `${reportPath}/accept` : `${reportPath}/follow-up`;
      const body =
        mode === "accept"
          ? {
              requesterName,
              requesterPhone,
              requesterEmail,
              comment,
              signatureDataUrl: signature
            }
          : {
              requesterName,
              requesterPhone,
              requesterEmail,
              comment
            };

      const response = await apiRequest<SubmitResponse>(path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify(body)
      });
      setResult(response.data);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit acknowledgement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-4xl">
        <header className="field-header">
          <div>
            <Link className="field-link" href={`/m/${publicId}/tickets/${ticketId}`}>
              Back to ticket status
            </Link>
            <h1 className="field-title">Service Acknowledgement</h1>
          </div>
          <ThemeToggle />
        </header>

        {loading ? (
          <Panel className="mt-8">
            <p className="field-muted">Loading acknowledgement...</p>
          </Panel>
        ) : null}

        {!loading && error && !ticket ? (
          <div className="field-alert-error mt-8">
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {ticket ? (
          <>
            <Panel className="mt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="field-muted">{ticket.ticketNumber}</p>
                  <h2 className="mt-1 text-xl font-semibold">{ticket.issueTitle}</h2>
                  <p className="field-muted mt-2 leading-6">{ticket.issueDescription}</p>
                </div>
                <span className={`status-badge ${statusTone(ticket.status)}`}>
                  {ticket.status.replaceAll("_", " ")}
                </span>
              </div>
            </Panel>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <Panel title="Machine">
                <InfoLine label="Customer" value={ticket.machine.customerName} />
                <InfoLine label="Machine" value={ticket.machine.machineName} />
                <InfoLine label="Model" value={ticket.machine.model} />
                <InfoLine label="Serial No." value={ticket.machine.serialNumber} />
                <InfoLine label="Location" value={ticket.machine.location} />
              </Panel>

              <Panel title="Service Report">
                {targetReport ? (
                  <div className="grid gap-4">
                    <InfoLine label="Technician" value={targetReport.technician.name} />
                    <InfoLine label="Diagnosis" value={targetReport.diagnosis} />
                    <InfoLine label="Action Taken" value={targetReport.actionTaken} />
                    <InfoLine label="Parts Used" value={targetReport.partsUsed || "None recorded"} />
                    <InfoLine label="Recommendations" value={targetReport.recommendations || "None recorded"} />
                    <InfoLine label="Result" value={targetReport.resolutionStatus.replaceAll("_", " ")} />
                  </div>
                ) : (
                  <p className="field-muted">No service report is attached.</p>
                )}
              </Panel>
            </div>

            {result ? (
              <section className="field-alert-success mt-6">
                <p className="text-sm font-medium">Response submitted</p>
                <h2 className="mt-2 text-xl font-semibold">{result.response.replaceAll("_", " ")}</h2>
                <p className="mt-2 text-sm">Thank you, {result.requesterName ?? requesterName}.</p>
              </section>
            ) : null}

            {!result && !isPending ? (
              <section className="field-alert-warning mt-6">
                <p className="text-sm font-medium">This acknowledgement is no longer pending.</p>
                <p className="mt-2 text-sm">Current response: {targetAcknowledgement?.response ?? ticket.status}</p>
              </section>
            ) : null}

            {!result && isPending ? (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <Panel title="Requester Response">
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#d9dee3] bg-[#eef3f6] p-1 dark:border-[#2f3742] dark:bg-[#1f242d]">
                    <button
                      className={`h-11 rounded-md text-sm font-medium ${
                        mode === "accept"
                          ? "bg-white text-[#155e75] shadow-sm dark:bg-[#0f1115] dark:text-[#67e8f9]"
                          : "text-[#5f6368] dark:text-[#a8b0ba]"
                      }`}
                      type="button"
                      onClick={() => setMode("accept")}
                    >
                      Accept
                    </button>
                    <button
                      className={`h-11 rounded-md text-sm font-medium ${
                        mode === "follow-up"
                          ? "bg-white text-[#155e75] shadow-sm dark:bg-[#0f1115] dark:text-[#67e8f9]"
                          : "text-[#5f6368] dark:text-[#a8b0ba]"
                      }`}
                      type="button"
                      onClick={() => setMode("follow-up")}
                    >
                      Follow Up
                    </button>
                  </div>

                  <TextInput label="Name" value={requesterName} required onChange={setRequesterName} />
                  <PhoneNumberInput label="Contact Number" value={requesterPhone} required onChange={setRequesterPhone} />
                  <TextInput label="Email" type="email" value={requesterEmail} onChange={setRequesterEmail} />

                  <label className="block">
                    <span className="field-label">{mode === "accept" ? "Comment" : "Follow-up Comment"}</span>
                    <textarea
                      className="field-textarea"
                      value={comment}
                      required={mode === "follow-up"}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </label>

                  {mode === "accept" ? <SignaturePad value={signature} onChange={setSignature} /> : null}
                </Panel>

                {error ? (
                  <div className="field-alert-error">
                    {error}
                  </div>
                ) : null}

                <button
                  className="field-button-primary min-h-12 w-full text-base"
                  type="submit"
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? "Submitting..." : mode === "accept" ? "Accept and Sign" : "Request Follow Up"}
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function Panel({
  title,
  className = "",
  children
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`field-panel ${className}`}>
      {title ? <h2 className="field-section-title">{title}</h2> : null}
      <div className={title ? "mt-4 grid gap-4" : ""}>{children}</div>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "status-blue";
    case "IN_PROGRESS":
      return "status-cyan";
    case "WAITING_FOR_REQUESTER":
      return "status-amber";
    case "WAITING_FOR_PARTS":
      return "status-orange";
    case "PENDING_ACKNOWLEDGEMENT":
      return "status-emerald";
    case "FOLLOW_UP_REQUIRED":
      return "status-violet";
    case "RESOLVED":
      return "status-green";
    case "CLOSED":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function TextInput({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SignaturePad({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignature = Boolean(value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resizeCanvas() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
      context.strokeStyle = "#111827";
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const point = getPoint(event);
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !point) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const point = getPoint(event);
    const context = canvas?.getContext("2d");
    if (!context || !point) return;

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function handlePointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!drawingRef.current || !canvas) return;

    drawingRef.current = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    saveSignature();
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    onChange("");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">Signature</span>
        <button
          className="field-button-secondary min-h-9 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={!hasSignature}
          onClick={clearSignature}
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="mt-2 h-44 w-full touch-none rounded-md border border-[#cfd6dd] bg-white outline-none transition focus:border-[#155e75] focus:ring-2 focus:ring-cyan-800/10 dark:border-[#2f3742] dark:focus:border-[#22d3ee] dark:focus:ring-cyan-300/10"
        aria-label="Draw signature"
        role="img"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
    </div>
  );
}
