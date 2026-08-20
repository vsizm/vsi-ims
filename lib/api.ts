import { NextRequest, NextResponse } from "next/server";
import { can, type Role, roles } from "@/lib/roles";
import { getRequestSession } from "@/lib/auth";

export function requireServiceAccess(request: NextRequest, permission: string) {
  const session = getRequestSession(request);
  if (session) {
    if (!roles.includes(session.role) || !can(session.role, permission)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return null;
  }

  const expectedKey = process.env.VSI_INTERNAL_API_KEY;
  const supplied = request.headers.get("authorization");
  const serviceRole = process.env.VSI_INTERNAL_API_ROLE as Role | undefined;
  if (!expectedKey || supplied !== `Bearer ${expectedKey}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!serviceRole || !roles.includes(serviceRole) || !can(serviceRole, permission)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export function requireAuthenticatedSession(request: NextRequest) {
  return getRequestSession(request);
}

export function apiError(error: unknown) { console.error(error); return NextResponse.json({ error: "Unable to complete the request." }, { status: 500 }); }
