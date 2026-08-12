import { NextRequest, NextResponse } from "next/server";
import { can, type Role, roles } from "@/lib/roles";

export function requireServiceAccess(request: NextRequest, permission: string) {
  const expected = process.env.VSI_INTERNAL_API_KEY;
  const supplied = request.headers.get("authorization");
  const role = request.headers.get("x-vsi-role") as Role | null;
  if (!expected || supplied !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!role || !roles.includes(role) || !can(role, permission)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
export function apiError(error: unknown) { console.error(error); return NextResponse.json({ error: "Unable to complete the request." }, { status: 500 }); }
