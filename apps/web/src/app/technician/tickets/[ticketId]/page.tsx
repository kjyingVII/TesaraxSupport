import { ProtectedPage } from "../../../../components/protected-page";
import { TicketDetailPage } from "./ticket-detail-page";

export default async function TechnicianTicketDetailRoute({
  params
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <TicketDetailPage ticketId={ticketId} />
    </ProtectedPage>
  );
}
