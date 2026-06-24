import { ProtectedPage } from "../../../components/protected-page";
import { TechnicianSchedulePage } from "./technician-schedule-page";

export default function ScheduleRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <TechnicianSchedulePage />
    </ProtectedPage>
  );
}
