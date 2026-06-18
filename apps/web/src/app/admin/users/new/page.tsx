import { ProtectedPage } from "../../../../components/protected-page";
import { UserFormPage } from "../user-form-page";

export default function NewUserRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN"]}>
      <UserFormPage />
    </ProtectedPage>
  );
}
