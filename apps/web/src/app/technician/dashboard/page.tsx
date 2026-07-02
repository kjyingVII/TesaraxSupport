import { ProtectedPage } from "../../../components/protected-page";
import { TeamDashboardPage } from "./team-dashboard-page";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <TeamDashboardPage />
    </ProtectedPage>
  );
}
