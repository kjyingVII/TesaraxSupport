import { ProtectedPage } from "../../../../../components/protected-page";
import { CustomerFormPage } from "../../customer-form-page";

export default async function EditCustomerRoute({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;

  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <CustomerFormPage customerId={customerId} />
    </ProtectedPage>
  );
}
