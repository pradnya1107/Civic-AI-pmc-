import type { UserRole } from "../modules/users/user.model";

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      user?: {
        id: string;
        name: string;
        fullName: string;
        email: string;
        role: UserRole;
        departmentId?: string;
        emailVerified: boolean;
        accountStatus: string;
      };
    }
  }
}

export {};
