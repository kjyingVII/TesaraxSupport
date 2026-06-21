import Link from "next/link";
import { ThemeToggle } from "../../components/theme-toggle";

export const metadata = {
  title: "Privacy Policy | Tesarax Support System",
  description: "Privacy policy for the Tesarax Support System."
};

const updatedAt = "22 June 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="field-page">
      <section className="field-shell max-w-4xl">
        <header className="field-header">
          <div>
            <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
              <Link className="field-link" href="/">
                Home
              </Link>
              <span>/</span>
              <span>Privacy Policy</span>
            </nav>
            <p className="field-eyebrow">Tesarax Support System</p>
            <h1 className="field-title">Privacy Policy</h1>
            <p className="field-muted mt-2">Last updated: {updatedAt}</p>
          </div>
          <ThemeToggle />
        </header>

        <article className="field-panel mt-5 space-y-6 text-sm leading-6">
          <section>
            <h2 className="field-section-title">Overview</h2>
            <p className="mt-2">
              Tesarax Support System is used to manage machine support requests, machine logs, service reports,
              acknowledgements, technician work, attachments, and related service notifications. This policy explains
              what information may be collected and how it is used.
            </p>
          </section>

          <section>
            <h2 className="field-section-title">Information We Collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Requester or user information such as name, phone number, and email address.</li>
              <li>Customer, machine, location, serial number, service reminder, and maintenance information.</li>
              <li>Support ticket details, comments, issue descriptions, service reports, machine logs, and acknowledgement records.</li>
              <li>Uploaded files such as photos, documents, manuals, and service attachments.</li>
              <li>Drawn signatures submitted for service or machine log acknowledgement.</li>
              <li>System records such as audit logs, notification logs, webhook delivery status, IP address, and browser/user agent where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="field-section-title">How We Use Information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To receive, process, assign, and resolve support tickets.</li>
              <li>To keep machine service, maintenance, replacement, inspection, upgrade, and repair history.</li>
              <li>To prepare technician service reports and collect user acknowledgements.</li>
              <li>To notify requesters, customer contacts, technicians, or administrators about support activities.</li>
              <li>To maintain system security, audit changes, troubleshoot issues, and improve service operations.</li>
            </ul>
          </section>

          <section>
            <h2 className="field-section-title">WhatsApp Notifications</h2>
            <p className="mt-2">
              If a phone number is provided, it may be used to send support-related WhatsApp notifications, including
              ticket updates, service report notices, machine log notices, and delivery status tracking. WhatsApp
              messages are sent through Meta WhatsApp services, and delivery callbacks may be stored for troubleshooting.
            </p>
          </section>

          <section>
            <h2 className="field-section-title">Sharing And Access</h2>
            <p className="mt-2">
              Information is used for machine support and service operations. Access may be provided to authorized
              administrators, supervisors, technicians, and customer users who need the information to submit requests,
              perform service work, review machine history, or acknowledge completed service. Information is not sold.
            </p>
          </section>

          <section>
            <h2 className="field-section-title">Retention</h2>
            <p className="mt-2">
              Records may be retained for service history, warranty, billing, compliance, dispute handling, and machine
              maintenance reference. Deletion or correction requests can be submitted using the contact details below,
              subject to legal, contractual, and operational requirements.
            </p>
          </section>

          <section>
            <h2 className="field-section-title">Security</h2>
            <p className="mt-2">
              Reasonable administrative and technical safeguards are used to protect support records, including account
              access controls, audit records, and controlled access to uploaded files. No system can guarantee absolute
              security, but access should be limited to authorized users and service purposes.
            </p>
          </section>

          <section>
            <h2 className="field-section-title">Contact</h2>
            <p className="mt-2">
              For privacy questions, correction requests, or deletion requests, contact the Tesarax support administrator.
            </p>
            <div className="mt-3 rounded-md bg-[#eef3f6] p-4 dark:bg-[#0f1115]">
              <p>
                Website:{" "}
                <a className="field-link" href="https://support.tesarax.cloud">
                  https://support.tesarax.cloud
                </a>
              </p>
              <p>Email: privacy@tesarax.cloud</p>
            </div>
          </section>
        </article>
      </section>
    </main>
  );
}
