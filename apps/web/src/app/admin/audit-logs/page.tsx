import { ProtectedPage } from "../../../components/protected-page";
import { AuditLogsPage } from "./audit-logs-page";

export default function AuditLogsRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <AuditLogsPage />
    </ProtectedPage>
  );
}
