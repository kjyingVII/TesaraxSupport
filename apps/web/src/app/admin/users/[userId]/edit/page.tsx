import { ProtectedPage } from "../../../../../components/protected-page";
import { UserFormPage } from "../../user-form-page";

export default async function EditUserRoute({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN"]}>
      <UserFormPage userId={userId} />
    </ProtectedPage>
  );
}
