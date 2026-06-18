import { ProtectedPage } from "../../../components/protected-page";
import { CustomersAdminPage } from "./customers-admin-page";

export default function AdminCustomersRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <CustomersAdminPage />
    </ProtectedPage>
  );
}
