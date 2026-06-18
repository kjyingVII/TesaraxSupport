import { ProtectedPage } from "../../components/protected-page";
import { ProfilePage } from "./profile-page";

export default function ProfileRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <ProfilePage />
    </ProtectedPage>
  );
}
