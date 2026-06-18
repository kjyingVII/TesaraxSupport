"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";
import { getMachineAccessSession } from "../../../lib/machine-access";

type PublicMachine = {
  publicId: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  customerName: string;
  isActive: boolean;
  requestAttachmentMaxFileMb: number;
  requestAttachmentMaxTotalMb: number;
};

type MachineResponse = {
  data: PublicMachine;
};

type TicketResponse = {
  data: {
    ticketId: string;
    ticketNumber: string;
    status: string;
    attachmentCount: number;
  };
};

type PublicComment = {
  id: string;
  comment: string;
  createdByRequesterName: string | null;
  createdAt: string;
  createdByUser: {
    name: string;
    email: string;
  } | null;
};

type PublicCommentsResponse = {
  data: PublicComment[];
};

type FormState = {
  requesterName: string;
  requesterCompany: string;
  requesterDepartment: string;
  requesterPhone: string;
  requesterEmail: string;
  issueTitle: string;
  issueDescription: string;
  issueCategory: string;
  priority: string;
};

const initialForm: FormState = {
  requesterName: "",
  requesterCompany: "",
  requesterDepartment: "",
  requesterPhone: "",
  requesterEmail: "",
  issueTitle: "",
  issueDescription: "",
  issueCategory: "BREAKDOWN",
  priority: "NORMAL"
};

const bytesPerMb = 1024 * 1024;

export function RequestTicketForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [machine, setMachine] = useState<PublicMachine | null>(null);
  const [machineAccessToken, setMachineAccessToken] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketResponse["data"] | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMachine() {
      const session = getMachineAccessSession(publicId);
      if (!session) {
        router.replace(`/m/${publicId}/access`);
        return;
      }

      setMachineAccessToken(session.accessToken);
      setForm((current) => ({
        ...current,
        requesterName: current.requesterName || session.requesterName,
        requesterPhone: current.requesterPhone || session.requesterPhone,
        requesterEmail: current.requesterEmail || session.requesterEmail || ""
      }));

      try {
        const response = await apiRequest<MachineResponse>(`/api/public/machines/${publicId}/request`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        });
        if (!mounted) return;
        setMachine(response.data);
        setForm((current) => ({
          ...current,
          requesterCompany: response.data.customerName
        }));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load machine.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMachine();

    return () => {
      mounted = false;
    };
  }, [publicId, router]);

  const canSubmit = useMemo(() => {
    return (
      form.requesterName.trim() &&
      (form.requesterPhone.trim() || form.requesterEmail.trim()) &&
      form.issueTitle.trim() &&
      form.issueDescription.trim() &&
      form.issueCategory.trim() &&
      form.priority.trim() &&
      machine?.isActive
    );
  }, [form, machine]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      validateAttachments(
        attachments,
        machine?.requestAttachmentMaxFileMb ?? 10,
        machine?.requestAttachmentMaxTotalMb ?? 100
      );
      const preparedAttachments = await Promise.all(
        attachments.map(async (attachment) => ({
          originalFileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
          dataBase64: await readFileAsDataUrl(attachment)
        }))
      );
      const response = await apiRequest<TicketResponse>(`/api/public/machines/${publicId}/tickets`, {
        method: "POST",
        headers: machineAccessToken ? { Authorization: `Bearer ${machineAccessToken}` } : undefined,
        body: JSON.stringify({
          ...form,
          attachments: preparedAttachments
        })
      });
      setTicket(response.data);
      await loadComments(response.data.ticketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateAttachments(files: FileList | null) {
    setAttachments(Array.from(files ?? []));
    setError(null);
  }

  async function loadComments(ticketId: string) {
    setLoadingComments(true);

    try {
      const response = await apiRequest<PublicCommentsResponse>(`/api/public/machines/tickets/${ticketId}/comments/list`, {
        method: "POST",
        body: JSON.stringify(requesterCommentIdentity(form))
      });
      setComments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load conversation.");
    } finally {
      setLoadingComments(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || !commentText.trim()) return;

    setPostingComment(true);
    setError(null);

    try {
      await apiRequest(`/api/public/machines/tickets/${ticket.ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          ...requesterCommentIdentity(form),
          comment: commentText
        })
      });
      setCommentText("");
      await loadComments(ticket.ticketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit comment.");
    } finally {
      setPostingComment(false);
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-3xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Machine Support</p>
            <h1 className="field-title">New Request</h1>
          </div>
          <ThemeToggle />
        </header>

        <Link className="field-link mt-4" href={`/m/${publicId}`}>
          Back to machine page
        </Link>

        {loading ? (
          <div className="field-panel mt-8">
            <p className="field-muted">Loading machine details...</p>
          </div>
        ) : null}

        {!loading && error && !machine ? (
          <div className="field-alert-error mt-8">
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {machine ? (
          <>
            <section className="field-panel mt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="field-eyebrow">{machine.customerName}</p>
                  <h2 className="mt-1 text-xl font-semibold">{machine.machineName}</h2>
                  <p className="field-muted mt-2">
                    {machine.model} / {machine.serialNumber}
                  </p>
                  <p className="field-muted mt-1">{machine.location}</p>
                </div>
                <span className={`status-badge ${machine.isActive ? "status-green" : "status-neutral"}`}>
                  {machine.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </section>

            {error ? (
              <div className="field-alert-error mt-5">
                {error}
              </div>
            ) : null}

            {ticket ? (
              <>
                <section className="field-alert-success mt-6">
                  <p className="text-sm font-medium">Request submitted successfully</p>
                  <h2 className="mt-2 text-2xl font-semibold">{ticket.ticketNumber}</h2>
                  <p className="mt-2 text-sm">
                    Your request is now in the technician queue. You can return to the machine page to check status or add more information below.
                  </p>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-md border border-emerald-300 p-3 dark:border-emerald-800">
                      <span className="block text-xs uppercase tracking-wide">Status</span>
                      <span className="mt-1 block font-semibold">{ticket.status}</span>
                    </div>
                    <div className="rounded-md border border-emerald-300 p-3 dark:border-emerald-800">
                      <span className="block text-xs uppercase tracking-wide">Attachments</span>
                      <span className="mt-1 block font-semibold">{ticket.attachmentCount}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link className="field-button-secondary" href={`/m/${publicId}/tickets/${ticket.ticketId}`}>
                      View Ticket Status
                    </Link>
                    <Link className="field-button-secondary" href={`/m/${publicId}`}>
                      Back to Machine Page
                    </Link>
                  </div>
                </section>

                <section className="field-panel mt-6">
                  <h2 className="field-section-title">Conversation</h2>
                  <form className="mt-4 grid gap-3" onSubmit={submitComment}>
                    <textarea
                      className="field-textarea min-h-24"
                      placeholder="Add more information or reply to the technician."
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                    />
                    <button
                      className="field-button-primary"
                      type="submit"
                      disabled={postingComment || !commentText.trim()}
                    >
                      {postingComment ? "Submitting..." : "Submit Comment"}
                    </button>
                  </form>

                  <div className="mt-4 grid gap-2">
                    {loadingComments ? <p className="field-muted">Loading conversation...</p> : null}
                    {!loadingComments && comments.length === 0 ? (
                      <p className="field-muted">No comments yet.</p>
                    ) : null}
                    {comments.map((item) => (
                      <div key={item.id} className="field-panel-subtle text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{item.createdByUser?.name ?? item.createdByRequesterName ?? "Requester"}</span>
                          <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDateTime(item.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{item.comment}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <FormPanel title="Requester">
                  <TextInput label="Name" value={form.requesterName} required onChange={(value) => updateField("requesterName", value)} />
                  <TextInput label="Company" value={form.requesterCompany} onChange={(value) => updateField("requesterCompany", value)} />
                  <TextInput label="Department" value={form.requesterDepartment} onChange={(value) => updateField("requesterDepartment", value)} />
                  <TextInput label="Phone" value={form.requesterPhone} onChange={(value) => updateField("requesterPhone", value)} />
                  <TextInput label="Email" type="email" value={form.requesterEmail} onChange={(value) => updateField("requesterEmail", value)} />
                </FormPanel>

                <FormPanel title="Issue">
                  <TextInput label="Title" value={form.issueTitle} required onChange={(value) => updateField("issueTitle", value)} />
                  <label className="block">
                    <span className="field-label">Description</span>
                    <textarea
                      className="field-textarea min-h-32"
                      value={form.issueDescription}
                      required
                      onChange={(event) => updateField("issueDescription", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="field-label">Category</span>
                    <select
                      className="field-input"
                      value={form.issueCategory}
                      onChange={(event) => updateField("issueCategory", event.target.value)}
                    >
                      <option value="BREAKDOWN">Breakdown</option>
                      <option value="ABNORMAL_SOUND">Abnormal sound</option>
                      <option value="QUALITY_ISSUE">Quality issue</option>
                      <option value="PREVENTIVE_MAINTENANCE">Preventive maintenance</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="field-label">Priority</span>
                    <select
                      className="field-input"
                      value={form.priority}
                      onChange={(event) => updateField("priority", event.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent</option>
                      <option value="MACHINE_DOWN">Machine down</option>
                    </select>
                  </label>
                </FormPanel>

                <FormPanel title="Attachments">
                  <p className="field-muted">
                    Maximum {machine.requestAttachmentMaxFileMb} MB per file, {machine.requestAttachmentMaxTotalMb} MB total per request.
                  </p>
                  <input
                    className="field-input py-2 text-sm"
                    type="file"
                    multiple
                    onChange={(event) => updateAttachments(event.target.files)}
                  />
                  {attachments.length > 0 ? (
                    <div className="grid gap-2">
                      {attachments.map((attachment) => (
                        <div
                          key={`${attachment.name}-${attachment.lastModified}-${attachment.size}`}
                          className="field-panel-subtle text-sm"
                        >
                          <span className="font-medium">{attachment.name}</span>
                          <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatBytes(attachment.size)}</span>
                        </div>
                      ))}
                      <p className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                        Total selected: {formatBytes(attachments.reduce((total, attachment) => total + attachment.size, 0))}
                      </p>
                    </div>
                  ) : (
                    <p className="field-muted">No attachments selected.</p>
                  )}
                </FormPanel>

                <button
                  className="field-button-primary min-h-12 w-full text-base"
                  type="submit"
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

function FormPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="field-panel">
      <h2 className="field-section-title">{title}</h2>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function validateAttachments(attachments: File[], maxFileMb: number, maxTotalMb: number) {
  const totalBytes = attachments.reduce((total, attachment) => total + attachment.size, 0);
  const maxFileBytes = maxFileMb * bytesPerMb;
  const maxTotalBytes = maxTotalMb * bytesPerMb;

  for (const attachment of attachments) {
    if (attachment.size === 0) {
      throw new Error("Attachment file cannot be empty.");
    }

    if (attachment.size > maxFileBytes) {
      throw new Error(`Attachment file must be ${maxFileMb} MB or smaller.`);
    }
  }

  if (totalBytes > maxTotalBytes) {
    throw new Error(`Ticket attachments cannot exceed ${maxTotalMb} MB in total.`);
  }
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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

function requesterCommentIdentity(form: FormState) {
  return {
    requesterName: form.requesterName,
    requesterPhone: form.requesterPhone,
    requesterEmail: form.requesterEmail
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
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
