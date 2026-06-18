import { ProtectedPage } from "../../../../components/protected-page";
import { MachineLogPage } from "./machine-log-page";

export default async function MachineLogsPage({
  params
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <MachineLogPage machineId={machineId} />
    </ProtectedPage>
  );
}
