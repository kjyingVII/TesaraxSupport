import { ProtectedPage } from "../../../components/protected-page";
import { UsersAdminPage } from "./users-admin-page";

export default function AdminUsersRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN"]}>
      <UsersAdminPage />
    </ProtectedPage>
  );
}
