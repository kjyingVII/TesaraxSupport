import { ProtectedPage } from "../../../../components/protected-page";
import { TaskDetailPage } from "./task-detail-page";

export default async function TaskDetailRoute({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <TaskDetailPage taskId={taskId} />
    </ProtectedPage>
  );
}
