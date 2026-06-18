import { ProtectedPage } from "../../../components/protected-page";
import { SettingsPage } from "./settings-page";

export default function AdminSettingsRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <SettingsPage />
    </ProtectedPage>
  );
}
