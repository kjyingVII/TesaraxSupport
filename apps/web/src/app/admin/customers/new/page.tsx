import { ProtectedPage } from "../../../../components/protected-page";
import { CustomerFormPage } from "../customer-form-page";

export default function NewCustomerRoute() {
  return (
    <ProtectedPage allowedRoles={["ADMIN", "SUPERVISOR"]}>
      <CustomerFormPage />
    </ProtectedPage>
  );
}
