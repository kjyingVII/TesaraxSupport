import { ProtectedPage } from "../../../../../../components/protected-page";
import { ServiceReportSubmittedPage } from "./service-report-submitted-page";

export default async function TechnicianServiceReportSubmittedRoute({
  params,
  searchParams
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ reportId?: string }>;
}) {
  const { ticketId } = await params;
  const { reportId = "" } = await searchParams;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <ServiceReportSubmittedPage ticketId={ticketId} reportId={reportId} />
    </ProtectedPage>
  );
}
