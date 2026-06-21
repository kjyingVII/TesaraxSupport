import { ProtectedPage } from "../../../components/protected-page";
import { NotificationLogsPage } from "./notification-logs-page";

export default function NotificationsRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <NotificationLogsPage />
    </ProtectedPage>
  );
}
