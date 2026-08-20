import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { Role } from "@/lib/roles";

const COOKIE_NAME = "vsi_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type Session = {
  userId: string;
  role: Role;
  email: string;
  exp: number;
};

function secret() {
  const value = process.env.VSI_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("VSI_SESSION_SECRET must be at least 32 characters.");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function encode(session: Session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string | undefined): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session.userId || !session.role || !session.email || !Number.isFinite(session.exp) || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function verifyPassword(password: string, stored: string) {
  const [prefix, n, r, p, salt, hash] = stored.split("$");
  if (prefix !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  try {
    const derived = scryptSync(password, salt, 64, { N: Number(n), r: Number(r), p: Number(p) }).toString("base64url");
    return derived.length === hash.length && timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function createSession(input: Omit<Session, "exp">) {
  return encode({ ...input, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function getRequestSession(request: NextRequest) {
  return decode(request.cookies.get(COOKIE_NAME)?.value);
}

export async function getSession() {
  const store = await cookies();
  return decode(store.get(COOKIE_NAME)?.value);
}

export function configuredAuth() {
  const administratorConfigured = Boolean(
    process.env.VSI_AUTH_EMAIL &&
    process.env.VSI_AUTH_PASSWORD_HASH &&
    process.env.VSI_AUTH_USER_ID &&
    process.env.VSI_AUTH_ROLE
  );

  const programmeManagerConfigured = Boolean(
    process.env.VSI_PM_AUTH_EMAIL &&
    process.env.VSI_PM_AUTH_PASSWORD_HASH &&
    process.env.VSI_PM_AUTH_USER_ID &&
    process.env.VSI_PM_AUTH_ROLE
  );

  return Boolean(
    process.env.VSI_SESSION_SECRET &&
    (administratorConfigured || programmeManagerConfigured)
  );
}
