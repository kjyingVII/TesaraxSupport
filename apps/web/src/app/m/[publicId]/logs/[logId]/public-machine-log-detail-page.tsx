"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiBaseUrl, apiRequest } from "../../../../../lib/api";
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
  acknowledgement: {
    id: string;
    response: string | null;
    requesterName: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    requesterComment: string | null;
    acknowledgedAt: string | null;
    tokenExpiresAt: string;
    signatureAttachment: {
      id: string;
      originalFileName: string;
      contentType: string;
      fileSizeBytes: number;
      createdAt: string;
    } | null;
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAcknowledgementForm, setShowAcknowledgementForm] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [comment, setComment] = useState("");
  const [signature, setSignature] = useState("");

  async function loadLog(mounted = true) {
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
      setRequesterName((current) => current || session.requesterName || response.data.requesterConfirmedName || "");
      setRequesterPhone((current) => current || session.requesterPhone || response.data.requesterContactPhone || "");
      setRequesterEmail((current) => current || session.requesterEmail || response.data.requesterContactEmail || "");
    } catch (err) {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : "Unable to load machine log.");
    } finally {
      if (mounted) setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    void loadLog(mounted);

    return () => {
      mounted = false;
    };
  }, [publicId, logId, router]);

  async function submitAcknowledgement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getMachineAccessSession(publicId);
    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    if (!signature.trim()) {
      setError("Signature is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/api/public/machines/${publicId}/logs/${logId}/acknowledgement/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          requesterName,
          requesterPhone,
          requesterEmail,
          comment,
          signatureDataUrl: signature
        })
      });
      setSignature("");
      setShowAcknowledgementForm(false);
      await loadLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit acknowledgement.");
    } finally {
      setSubmitting(false);
    }
  }

  function machineLogDownloadUrl(attachmentId: string) {
    const session = getMachineAccessSession(publicId);
    const params = session?.accessToken ? `?accessToken=${encodeURIComponent(session.accessToken)}` : "";
    return `${apiBaseUrl}/api/public/machines/${publicId}/logs/${logId}/attachments/${attachmentId}/download${params}`;
  }

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
                <DetailLine label="Name" value={log.loggedByRequesterName || log.requesterConfirmedName || "Not recorded"} />
                <DetailLine label="Contact Number" value={log.requesterContactPhone || "Not recorded"} />
                <DetailLine label="Email" value={log.requesterContactEmail || "Not recorded"} />
                <DetailLine label="User Signature Required" value={log.requesterAcknowledgementRequired ? "Yes" : "No"} />
              </div>
            </section>

            <section className="field-panel mt-5">
              <h2 className="field-section-title">Acknowledgement</h2>
              {log.acknowledgement?.response ? (
                <div className="mt-4 grid gap-4">
                  <DetailLine label="Acknowledged By" value={log.acknowledgement.requesterName || "Not recorded"} />
                  <DetailLine label="Contact Number" value={log.acknowledgement.requesterPhone || "Not recorded"} />
                  <DetailLine label="Email" value={log.acknowledgement.requesterEmail || "Not recorded"} />
                  <DetailLine
                    label="Acknowledged At"
                    value={log.acknowledgement.acknowledgedAt ? formatDateTime(log.acknowledgement.acknowledgedAt) : "Not recorded"}
                  />
                  {log.acknowledgement.requesterComment ? (
                    <DetailLine label="Comment" value={log.acknowledgement.requesterComment} multiline />
                  ) : null}
                  {log.acknowledgement.signatureAttachment ? (
                    <SignaturePreview downloadUrl={machineLogDownloadUrl(log.acknowledgement.signatureAttachment.id)} />
                  ) : null}
                </div>
              ) : showAcknowledgementForm ? (
                <form className="mt-4 grid gap-4" onSubmit={submitAcknowledgement}>
                  <p className="field-muted">
                    User signature is {log.requesterAcknowledgementRequired ? "required" : "optional"} for this machine log.
                  </p>
                  <TextInput label="Name" value={requesterName} required onChange={setRequesterName} />
                  <TextInput label="Contact Number" value={requesterPhone} required onChange={setRequesterPhone} />
                  <TextInput label="Email" type="email" value={requesterEmail} onChange={setRequesterEmail} />
                  <label className="block">
                    <span className="field-meta-label">Comment</span>
                    <textarea
                      className="field-input mt-2 min-h-28 py-3"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </label>
                  <SignaturePad value={signature} onChange={setSignature} />
                  <button
                    className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={submitting || !requesterName.trim() || !requesterPhone.trim() || !signature.trim()}
                  >
                    {submitting ? "Submitting..." : "Acknowledge and Sign"}
                  </button>
                </form>
              ) : (
                <div className="mt-4 grid gap-4">
                  <p className="field-muted">
                    User signature is {log.requesterAcknowledgementRequired ? "required" : "optional"} for this machine log.
                  </p>
                  <button
                    className="field-button-secondary w-fit"
                    type="button"
                    onClick={() => setShowAcknowledgementForm(true)}
                  >
                    Acknowledge Service
                  </button>
                </div>
              )}
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
                    <a key={attachment.id} className="field-panel-subtle text-sm" href={machineLogDownloadUrl(attachment.id)}>
                      <p className="font-medium">{attachment.originalFileName}</p>
                      <p className="field-muted mt-1">
                        {formatBytes(attachment.fileSizeBytes)} / Uploaded {formatDateTime(attachment.createdAt)}
                      </p>
                    </a>
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
      <span className="field-meta-label">{label}</span>
      <input
        className="field-input mt-2"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SignaturePreview({ downloadUrl }: { downloadUrl: string }) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSignature() {
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("Unable to load signature.");
        const text = await response.text();
        if (mounted) setSignatureDataUrl(text);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load signature.");
      }
    }

    void loadSignature();

    return () => {
      mounted = false;
    };
  }, [downloadUrl]);

  return (
    <div>
      <p className="field-meta-label">Signature</p>
      {signatureDataUrl ? (
        <div className="mt-2 rounded-md border border-[#d9dee3] bg-white p-3 dark:border-[#2f3742]">
          <img className="max-h-36 w-full object-contain" src={signatureDataUrl} alt="Acknowledgement signature" />
        </div>
      ) : (
        <p className="field-muted mt-2">{error ?? "Loading signature..."}</p>
      )}
    </div>
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

    const point = getPoint(event);
    const context = canvasRef.current?.getContext("2d");
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
        <span className="field-meta-label">Signature</span>
        <button
          className="field-button-secondary h-9 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={!hasSignature}
          onClick={clearSignature}
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="mt-2 h-44 w-full touch-none rounded-md border border-[#cfd5dc] bg-white outline-none focus:border-[#155e75] dark:border-[#3a424d]"
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
