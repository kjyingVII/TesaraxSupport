import { ProtectedPage } from "../../../components/protected-page";
import { ServiceRemindersPage } from "./service-reminders-page";

export default function AdminServiceRemindersRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <ServiceRemindersPage />
    </ProtectedPage>
  );
}
