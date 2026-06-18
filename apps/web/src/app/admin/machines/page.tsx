import { ProtectedPage } from "../../../components/protected-page";
import { MachinesAdminPage } from "./machines-admin-page";

export default function AdminMachinesRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <MachinesAdminPage />
    </ProtectedPage>
  );
}
