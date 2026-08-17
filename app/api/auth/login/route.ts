import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { roles, type Role } from "@/lib/roles";

export async function POST(request: NextRequest) {
  const email = process.env.VSI_AUTH_EMAIL;
  const passwordHash = process.env.VSI_AUTH_PASSWORD_HASH;
  const userId = process.env.VSI_AUTH_USER_ID;
  const role = process.env.VSI_AUTH_ROLE as Role | undefined;

  if (!email || !passwordHash || !userId || !role || !process.env.VSI_SESSION_SECRET) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  if (!roles.includes(role)) {
    return NextResponse.json({ error: "Authentication configuration is invalid." }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const valid = body.email.trim().toLowerCase() === email.trim().toLowerCase() && verifyPassword(body.password, passwordHash);
  if (!valid) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  await setSessionCookie(createSession({ userId, role, email: email.trim().toLowerCase() }));
  return NextResponse.json({ authenticated: true, role });
}
