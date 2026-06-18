import { ProtectedPage } from "../../../../../components/protected-page";
import { ServiceReportPage } from "./service-report-page";

export default async function TechnicianServiceReportPage({
  params
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <ServiceReportPage ticketId={ticketId} />
    </ProtectedPage>
  );
}
