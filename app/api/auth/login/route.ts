import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { roles, type Role } from "@/lib/roles";

type AuthAccount = {
  email: string;
  passwordHash: string;
  userId: string;
  role: Role;
};

export async function POST(request: NextRequest) {
  const accounts: AuthAccount[] = [
    {
      email: process.env.VSI_AUTH_EMAIL ?? "",
      passwordHash: process.env.VSI_AUTH_PASSWORD_HASH ?? "",
      userId: process.env.VSI_AUTH_USER_ID ?? "",
      role: process.env.VSI_AUTH_ROLE as Role,
    },
    {
      email: process.env.VSI_PM_AUTH_EMAIL ?? "",
      passwordHash: process.env.VSI_PM_AUTH_PASSWORD_HASH ?? "",
      userId: process.env.VSI_PM_AUTH_USER_ID ?? "",
      role: process.env.VSI_PM_AUTH_ROLE as Role,
    },
  ];

  const configuredAccounts = accounts.filter(
    (account) =>
      account.email &&
      account.passwordHash &&
      account.userId &&
      account.role &&
      roles.includes(account.role)
  );

  if (!process.env.VSI_SESSION_SECRET || configuredAccounts.length === 0) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 }
    );
  }

  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();

  const account = configuredAccounts.find(
    (item) => item.email.trim().toLowerCase() === email
  );

  if (!account || !verifyPassword(body.password, account.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 }
    );
  }

  await setSessionCookie(
    createSession({
      userId: account.userId,
      role: account.role,
      email: account.email.trim().toLowerCase(),
    })
  );

  return NextResponse.json({
    authenticated: true,
    role: account.role,
  });
}
