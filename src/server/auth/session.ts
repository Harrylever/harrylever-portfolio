import { createHmac } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import {
  type AdminAuthConfig,
  readAdminAuthConfig,
} from "@/server/auth/config";
import {
  constantTimeEqual,
  normalizeAdminEmail,
} from "@/server/auth/credentials";

/** Stable id recorded as the actor for every administrator action. */
export const ADMIN_USER_ID = "admin";
export const ADMIN_SESSION_COOKIE = "portfolio_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const issuer = "harrylever-portfolio";
const audience = "harrylever-portfolio:admin";

export type AdminSession = {
  user: { id: string; email: string; role: "admin" };
  expiresAt: Date;
};

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  expires?: Date;
  maxAge?: number;
};

export type CookieWriter = {
  set(name: string, value: string, options: SessionCookieOptions): unknown;
};

export function buildAdminSession(
  email: string,
  expiresAt: Date,
): AdminSession {
  return {
    user: {
      id: ADMIN_USER_ID,
      email: normalizeAdminEmail(email),
      role: "admin",
    },
    expiresAt,
  };
}

function signingKey(config: AdminAuthConfig): Uint8Array {
  return new TextEncoder().encode(config.sessionSecret);
}

/**
 * Binds a token to the current preset credentials, so changing the admin
 * email or password revokes every outstanding session.
 */
function credentialFingerprint(config: AdminAuthConfig): string {
  return createHmac("sha256", config.sessionSecret)
    .update(`${normalizeAdminEmail(config.email)}\n${config.password}`)
    .digest("base64url");
}

export async function createSession({
  config = readAdminAuthConfig(),
  now = new Date(),
}: { config?: AdminAuthConfig; now?: Date } = {}): Promise<{
  token: string;
  session: AdminSession;
}> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAtSeconds = issuedAt + ADMIN_SESSION_TTL_SECONDS;
  const email = normalizeAdminEmail(config.email);
  const token = await new SignJWT({
    email,
    role: "admin",
    cfp: credentialFingerprint(config),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(ADMIN_USER_ID)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAtSeconds)
    .sign(signingKey(config));

  return {
    token,
    session: buildAdminSession(email, new Date(expiresAtSeconds * 1000)),
  };
}

/** Returns the session for a valid token, or null for anything else. */
export async function readSession(
  token: string | undefined,
  config: AdminAuthConfig = readAdminAuthConfig(),
): Promise<AdminSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingKey(config), {
      algorithms: ["HS256"],
      issuer,
      audience,
      subject: ADMIN_USER_ID,
      requiredClaims: ["exp", "iat"],
    });

    if (
      payload.role !== "admin" ||
      typeof payload.email !== "string" ||
      typeof payload.cfp !== "string" ||
      typeof payload.exp !== "number" ||
      !constantTimeEqual(payload.email, normalizeAdminEmail(config.email)) ||
      !constantTimeEqual(payload.cfp, credentialFingerprint(config))
    ) {
      return null;
    }

    return buildAdminSession(payload.email, new Date(payload.exp * 1000));
  } catch {
    return null;
  }
}

/** Pure cookie parser so route handlers and tests can pass raw Headers. */
export function sessionTokenFromHeaders(headers: Headers): string | undefined {
  const cookieHeader = headers.get("cookie");

  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== ADMIN_SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();

    try {
      return decodeURIComponent(value) || undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function sessionCookieOptions(
  expiresAt: Date,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
    path: "/",
    expires: expiresAt,
  };
}

async function defaultCookieWriter(): Promise<CookieWriter> {
  const { cookies } = await import("next/headers");

  return cookies();
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
  store?: CookieWriter,
): Promise<void> {
  (store ?? (await defaultCookieWriter())).set(
    ADMIN_SESSION_COOKIE,
    token,
    sessionCookieOptions(expiresAt),
  );
}

export async function clearSessionCookie(store?: CookieWriter): Promise<void> {
  const options: SessionCookieOptions = {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  };

  delete options.expires;
  (store ?? (await defaultCookieWriter())).set(
    ADMIN_SESSION_COOKIE,
    "",
    options,
  );
}
