import { UserRole } from "@prisma/client";

export type UpdateUserDto = {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
};
