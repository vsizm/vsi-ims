import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    environment: process.env.VERCEL_ENV ?? "development",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    apiKeyConfigured: Boolean(process.env.VSI_INTERNAL_API_KEY),
  });
}
