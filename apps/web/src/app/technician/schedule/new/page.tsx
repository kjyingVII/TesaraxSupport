import { ProtectedPage } from "../../../../components/protected-page";
import { NewScheduledTaskPage } from "./new-scheduled-task-page";

export default function NewScheduleRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR", "TECHNICIAN"]}>
      <NewScheduledTaskPage />
    </ProtectedPage>
  );
}
