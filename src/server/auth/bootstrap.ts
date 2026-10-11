import { betterAuth } from "better-auth";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/server/auth";
import { createAuthOptions } from "@/server/auth/config";
import { db } from "@/server/db/client";
import { createId } from "@/server/db/id";
import { session, user } from "@/server/db/schema/auth";

const adminIdentitySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

const passwordRotationSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  newPassword: z.string().min(8).max(128),
});

export type BootstrapAdminInput = z.input<typeof adminIdentitySchema>;
export type RotateAdminPasswordInput = z.input<typeof passwordRotationSchema>;

export type BootstrapAdminResult = {
  created: boolean;
  userId: string;
  email: string;
};

async function currentAdmins() {
  return db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.role, "admin"));
}

export async function bootstrapAdmin(
  input: BootstrapAdminInput,
): Promise<BootstrapAdminResult> {
  const parsed = adminIdentitySchema.parse(input);
  const admins = await currentAdmins();

  if (admins.length > 0) {
    const existing = admins.find((admin) => admin.email === parsed.email);

    if (existing && admins.length === 1) {
      return { created: false, userId: existing.id, email: existing.email };
    }

    throw new Error("An administrator already exists");
  }

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, parsed.email))
    .limit(1);

  if (existingUser) {
    throw new Error("An account already exists for the administrator email");
  }

  const bootstrapAuth = betterAuth(createAuthOptions({ allowSignUp: true }));
  const created = await bootstrapAuth.api.signUpEmail({
    body: {
      name: parsed.name,
      email: parsed.email,
      password: parsed.password,
    },
  });

  try {
    await db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('portfolio:bootstrap-admin'))`,
      );

      const [competingAdmin] = await transaction
        .select({ id: user.id })
        .from(user)
        .where(
          and(eq(user.role, "admin"), sql`${user.id} <> ${created.user.id}`),
        )
        .limit(1);

      if (competingAdmin) throw new Error("An administrator already exists");

      const promoted = await transaction
        .update(user)
        .set({ role: "admin", updatedAt: new Date() })
        .where(and(eq(user.id, created.user.id), eq(user.role, "user")))
        .returning({ id: user.id });

      if (promoted.length !== 1) {
        throw new Error("Could not promote the administrator account");
      }

      await transaction
        .delete(session)
        .where(eq(session.userId, created.user.id));
    });
  } catch (error) {
    await db.delete(user).where(eq(user.id, created.user.id));
    throw error;
  }

  return { created: true, userId: created.user.id, email: parsed.email };
}

export async function rotateAdminPassword(
  input: RotateAdminPasswordInput,
): Promise<{ rotated: true }> {
  const parsed = passwordRotationSchema.parse(input);
  const [administrator] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, parsed.email), eq(user.role, "admin")))
    .limit(1);

  if (!administrator) throw new Error("Administrator not found");

  const token = createId();
  const identifier = `reset-password:${token}`;
  const context = await auth.$context;

  await context.internalAdapter.createVerificationValue({
    identifier,
    value: administrator.id,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.newPassword, token },
    });
  } finally {
    await context.internalAdapter.deleteVerificationByIdentifier(identifier);
  }

  return { rotated: true };
}
