import { ProtectedPage } from "../../components/protected-page";
import { AdminDashboard } from "./admin-dashboard";

export default function AdminPage() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <AdminDashboard />
    </ProtectedPage>
  );
}
