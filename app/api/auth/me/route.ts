import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, userId: session.userId, email: session.email, role: session.role, expiresAt: new Date(session.exp).toISOString() });
}
