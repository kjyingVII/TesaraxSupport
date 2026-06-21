"use client";

import { FormEvent, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PhoneNumberInput } from "../../../components/phone-number-input";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type ServiceReport = {
  id: string;
  diagnosis: string;
  actionTaken: string;
  partsUsed: string | null;
  recommendations: string | null;
  technicianRemarks: string | null;
  resolutionStatus: string;
  serviceStartAt: string;
  serviceEndAt: string;
  technician: {
    name: string;
    email: string;
  };
};

type AcknowledgementDetail = {
  id: string;
  tokenExpiresAt: string;
  response: string | null;
  acknowledgedAt: string | null;
  requesterPhone: string | null;
  requesterEmail: string | null;
  serviceReport: ServiceReport | null;
  machineLog: {
    id: string;
    activityType: string;
    workDate: string;
    workEndAt: string | null;
    title: string;
    workSummary: string;
    partsUsed: string | null;
    requesterAcknowledgementRequired: boolean;
    machine: {
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customer: {
        name: string;
      };
    };
  } | null;
  ticket: {
    id: string;
    ticketNumber: string;
    status: string;
    issueTitle: string;
    issueDescription: string;
    priority: string;
    requesterName: string;
    requesterCompany: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    machine: {
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customer: {
        name: string;
      };
    };
    serviceReports: ServiceReport[];
  } | null;
};

type AcknowledgementResponse = {
  data: AcknowledgementDetail;
};

type SubmitResponse = {
  data: {
    response: string;
    requesterName: string | null;
    acknowledgedAt: string | null;
  };
};

type ActionMode = "accept" | "follow-up";

export function AcknowledgementForm({ token }: { token: string }) {
  const [detail, setDetail] = useState<AcknowledgementDetail | null>(null);
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
    let mounted = true;

    async function loadAcknowledgement() {
      try {
        const response = await apiRequest<AcknowledgementResponse>(`/api/public/acknowledgements/${token}`);
        if (!mounted) return;
        setDetail(response.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load acknowledgement.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAcknowledgement();

    return () => {
      mounted = false;
    };
  }, [token]);

  const acknowledgementReport = detail?.serviceReport ?? detail?.ticket?.serviceReports[0] ?? null;
  const isMachineLogAcknowledgement = Boolean(detail?.machineLog);
  const isPending = detail ? !detail.response && (detail.machineLog ? true : detail.ticket?.status === "PENDING_ACKNOWLEDGEMENT") : false;

  const canSubmit = useMemo(() => {
    if (!requesterName.trim() || !requesterPhone.trim() || !isPending) return false;
    if (isMachineLogAcknowledgement && mode === "follow-up") return false;
    if (mode === "accept") return Boolean(signature.trim());
    return Boolean(comment.trim());
  }, [comment, isMachineLogAcknowledgement, isPending, mode, requesterName, requesterPhone, signature]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    setResult(null);

    try {
      const path =
        mode === "accept"
          ? `/api/public/acknowledgements/${token}/accept`
          : `/api/public/acknowledgements/${token}/follow-up`;
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
        body: JSON.stringify(body)
      });
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit acknowledgement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-5 sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Machine Support</p>
            <h1 className="text-2xl font-semibold">Service Acknowledgement</h1>
          </div>
          <ThemeToggle />
        </header>

        {loading ? (
          <Panel className="mt-8">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading acknowledgement...</p>
          </Panel>
        ) : null}

        {!loading && error && !detail ? (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {detail ? (
          <>
            <Panel className="mt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {detail.ticket?.ticketNumber ?? "Machine Log"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{detail.ticket?.issueTitle ?? detail.machineLog?.title ?? "Acknowledgement"}</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                    {detail.ticket?.issueDescription ?? detail.machineLog?.workSummary ?? ""}
                  </p>
                </div>
                <span className="w-fit rounded-md border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-700">
                  {detail.ticket?.status ?? (detail.response ? "ACKNOWLEDGED" : "PENDING SIGNATURE")}
                </span>
              </div>
            </Panel>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <Panel title="Machine">
                <InfoLine label="Customer" value={(detail.ticket?.machine ?? detail.machineLog?.machine)?.customer.name ?? "Not recorded"} />
                <InfoLine label="Machine" value={(detail.ticket?.machine ?? detail.machineLog?.machine)?.machineName ?? "Not recorded"} />
                <InfoLine label="Model" value={(detail.ticket?.machine ?? detail.machineLog?.machine)?.model ?? "Not recorded"} />
                <InfoLine label="Serial No." value={(detail.ticket?.machine ?? detail.machineLog?.machine)?.serialNumber ?? "Not recorded"} />
                <InfoLine label="Location" value={(detail.ticket?.machine ?? detail.machineLog?.machine)?.location ?? "Not recorded"} />
              </Panel>

              <Panel title={detail.machineLog ? "Machine Activity" : "Service Report"}>
                {detail.machineLog ? (
                  <div className="grid gap-4">
                    <InfoLine label="Activity Type" value={detail.machineLog.activityType.replaceAll("_", " ")} />
                    <InfoLine label="Work Time" value={formatDateTime(detail.machineLog.workDate)} />
                    <InfoLine label="End Time" value={detail.machineLog.workEndAt ? formatDateTime(detail.machineLog.workEndAt) : "Not recorded"} />
                    <InfoLine label="Summary" value={detail.machineLog.workSummary} />
                    <InfoLine label="Parts Used" value={detail.machineLog.partsUsed || "None recorded"} />
                  </div>
                ) : acknowledgementReport ? (
                  <div className="grid gap-4">
                    <InfoLine label="Technician" value={acknowledgementReport.technician.name} />
                    <InfoLine label="Diagnosis" value={acknowledgementReport.diagnosis} />
                    <InfoLine label="Action Taken" value={acknowledgementReport.actionTaken} />
                    <InfoLine label="Parts Used" value={acknowledgementReport.partsUsed || "None recorded"} />
                    <InfoLine label="Recommendations" value={acknowledgementReport.recommendations || "None recorded"} />
                    <InfoLine label="Result" value={acknowledgementReport.resolutionStatus} />
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">No service report is attached.</p>
                )}
              </Panel>
            </div>

            {result ? (
              <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <p className="text-sm font-medium">Response submitted</p>
                <h2 className="mt-2 text-xl font-semibold">{result.response}</h2>
                <p className="mt-2 text-sm">Thank you, {result.requesterName ?? requesterName}.</p>
              </section>
            ) : null}

            {!result && !isPending ? (
              <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <p className="text-sm font-medium">This acknowledgement is no longer pending.</p>
                <p className="mt-2 text-sm">Current response: {detail.response ?? detail.ticket?.status ?? "Acknowledged"}</p>
              </section>
            ) : null}

            {!result && isPending ? (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <Panel title="Requester Response">
                  {!isMachineLogAcknowledgement ? (
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
                    <button
                      className={`h-11 rounded-md text-sm font-medium ${
                        mode === "accept"
                          ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
                          : "text-neutral-600 dark:text-neutral-300"
                      }`}
                      type="button"
                      onClick={() => setMode("accept")}
                    >
                      Accept
                    </button>
                    <button
                      className={`h-11 rounded-md text-sm font-medium ${
                        mode === "follow-up"
                          ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
                          : "text-neutral-600 dark:text-neutral-300"
                      }`}
                      type="button"
                      onClick={() => setMode("follow-up")}
                    >
                      Follow Up
                    </button>
                    </div>
                  ) : null}

                  <TextInput label="Name" value={requesterName} required onChange={setRequesterName} />
                  <PhoneNumberInput label="Contact Number" value={requesterPhone} required onChange={setRequesterPhone} />
                  <TextInput label="Email" type="email" value={requesterEmail} onChange={setRequesterEmail} />

                  <label className="block">
                    <span className="text-sm font-medium">
                      {mode === "accept" ? "Comment" : "Follow-up Comment"}
                    </span>
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-md border border-neutral-300 bg-white px-3 py-3 text-base outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
                      value={comment}
                      required={mode === "follow-up"}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </label>

                  {mode === "accept" ? (
                    <SignaturePad value={signature} onChange={setSignature} />
                  ) : null}
                </Panel>

                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                    {error}
                  </div>
                ) : null}

                <button
                  className="h-12 w-full rounded-md bg-neutral-950 px-4 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950"
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
    <section className={`rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  );
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
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-md border border-neutral-300 bg-white px-3 text-base outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
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
        <span className="text-sm font-medium">Signature</span>
        <button
          className="h-9 rounded-md border border-neutral-300 px-3 text-sm font-medium text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"
          type="button"
          disabled={!hasSignature}
          onClick={clearSignature}
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="mt-2 h-44 w-full touch-none rounded-md border border-neutral-300 bg-white outline-none focus:border-neutral-950 dark:border-neutral-700 dark:focus:border-neutral-100"
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
