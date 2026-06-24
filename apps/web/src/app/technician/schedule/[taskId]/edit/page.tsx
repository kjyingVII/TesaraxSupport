import { ProtectedPage } from "../../../../../components/protected-page";
import { EditScheduledTaskPage } from "./edit-scheduled-task-page";

export default async function EditScheduleRoute({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <EditScheduledTaskPage taskId={taskId} />
    </ProtectedPage>
  );
}
