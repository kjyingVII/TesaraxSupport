import { ProtectedPage } from "../../../../components/protected-page";
import { MachineFormPage } from "../machine-form-page";

export default function NewMachineRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <MachineFormPage />
    </ProtectedPage>
  );
}
