import { UserRole } from "@prisma/client";

export type CreateUserDto = {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
};
