import type { User as BetterAuthUser } from "better-auth/types";

export type User = Omit<BetterAuthUser, "email"> & {
  email: string | null;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean;
  locale?: string | null;
  role?: string | null;
};
