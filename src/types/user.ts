export type PlanTier = "free" | "basic" | "pro";

export type AppUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
};

export type UserSessionState = {
  authenticated: boolean;
  userId: string | null;
  userEmail: string | null;
};
