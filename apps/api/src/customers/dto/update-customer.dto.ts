export type UpdateCustomerDto = {
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  remarks?: string | null;
  isActive?: boolean;
};

