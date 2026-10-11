import type { UserRole } from "../modules/users/user.model";

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      user?: {
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        emailVerified: boolean;
        accountStatus: string;
      };
    }
  }
}

export {};
