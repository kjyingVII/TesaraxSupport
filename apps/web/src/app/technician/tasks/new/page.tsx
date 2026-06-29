import { ProtectedPage } from "../../../../components/protected-page";
import { NewTaskPage } from "./new-task-page";

export default function NewTasksRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <NewTaskPage />
    </ProtectedPage>
  );
}
