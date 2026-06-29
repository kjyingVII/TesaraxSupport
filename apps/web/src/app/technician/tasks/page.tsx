import { ProtectedPage } from "../../../components/protected-page";
import { TasksPage } from "./tasks-page";

export default function TasksRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <TasksPage />
    </ProtectedPage>
  );
}
