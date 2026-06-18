import { ProtectedPage } from "../../../../../components/protected-page";
import { NewMachineLogPage } from "./new-machine-log-page";

export default async function NewMachineLogRoute({
  params
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <NewMachineLogPage machineId={machineId} />
    </ProtectedPage>
  );
}
