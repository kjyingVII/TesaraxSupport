import { ProtectedPage } from "../../../../../components/protected-page";
import { MachineFormPage } from "../../machine-form-page";

export default async function EditMachineRoute({
  params
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <MachineFormPage machineId={machineId} />
    </ProtectedPage>
  );
}
