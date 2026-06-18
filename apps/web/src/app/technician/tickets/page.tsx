import { ProtectedPage } from "../../../components/protected-page";
import { TicketWorkbench } from "./ticket-workbench";

export default function TechnicianTicketsPage() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <TicketWorkbench />
    </ProtectedPage>
  );
}
