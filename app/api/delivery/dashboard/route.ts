import { and, eq, gte, lt, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { indicators, projects, results, targets } from "@/db/schema";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";

const n = (value: unknown) => Number(value ?? 0);

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "results.read");
  if (denied) return denied;
  try {
    const yearParam = Number(new URL(request.url).searchParams.get("year"));
    const year = Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 2100 ? yearParam : new Date().getUTCFullYear();
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    const db = database();
    const rows = await db
      .select({
        projectId: projects.id,
        projectCode: projects.code,
        projectName: projects.name,
        indicatorId: indicators.id,
        indicatorCode: indicators.code,
        indicatorName: indicators.name,
        unit: indicators.unit,
        target: sql<string>`coalesce(${targets.targetValue}, 0)`,
        actual: sql<string>`coalesce(sum(${results.actualValue}), 0)`,
      })
      .from(indicators)
      .innerJoin(projects, eq(indicators.projectId, projects.id))
      .leftJoin(targets, and(eq(targets.indicatorId, indicators.id), eq(targets.year, year)))
      .leftJoin(results, and(eq(results.targetId, targets.id), gte(results.periodEnd, start), lt(results.periodEnd, end)))
      .where(eq(indicators.active, true))
      .groupBy(projects.id, projects.code, projects.name, indicators.id, indicators.code, indicators.name, indicators.unit, targets.targetValue);

    const byProject = new Map<string, { projectCode: string; projectName: string; target: number; actual: number; indicators: number; achievedIndicators: number }>();
    for (const row of rows) {
      const target = n(row.target);
      const actual = n(row.actual);
      const current = byProject.get(row.projectId) ?? { projectCode: row.projectCode, projectName: row.projectName, target: 0, actual: 0, indicators: 0, achievedIndicators: 0 };
      if (target > 0) { current.target += target; current.actual += actual; current.indicators += 1; if (actual >= target) current.achievedIndicators += 1; }
      byProject.set(row.projectId, current);
    }

    const projectsOut = [...byProject.values()].map((row) => ({
      ...row,
      achievementPercent: row.target === 0 ? 0 : Number(((row.actual / row.target) * 100).toFixed(2)),
      status: row.target === 0 ? "NO_TARGET" : row.actual >= row.target ? "ON_TRACK" : row.actual >= row.target * 0.8 ? "WATCH" : "BEHIND",
    }));
    return NextResponse.json({ year, projects: projectsOut });
  } catch (error) {
    return apiError(error);
  }
}
