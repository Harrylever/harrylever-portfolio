import { betterAuth } from "better-auth";

import { createAuthOptions } from "@/server/auth/config";

export const auth = betterAuth(createAuthOptions({ allowSignUp: false }));
