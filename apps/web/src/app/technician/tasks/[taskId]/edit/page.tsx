import { ProtectedPage } from "../../../../../components/protected-page";
import { EditTaskPage } from "./edit-task-page";

export default async function EditTasksRoute({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <EditTaskPage taskId={taskId} />
    </ProtectedPage>
  );
}
