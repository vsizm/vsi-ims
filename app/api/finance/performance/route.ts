import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/db";
import { apiError, requireServiceAccess } from "@/lib/api";
import { activities, indicators, projects, results, targets } from "@/db/schema";

const toNumber = (value: unknown) => Number(value ?? 0);

export async function GET(request: NextRequest) {
  const denied = requireServiceAccess(request, "finance.dashboard.read");
  if (denied) return denied;

  try {
    const yearParam = Number(new URL(request.url).searchParams.get("year"));
    const financialYear = Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 2100
      ? yearParam
      : new Date().getUTCFullYear();
    const db = database();

    const [targetRows, resultRows] = await Promise.all([
      db.select({
        targetId: targets.id,
        indicatorId: indicators.id,
        indicatorCode: indicators.code,
        indicatorName: indicators.name,
        unit: indicators.unit,
        level: indicators.level,
        projectId: projects.id,
        projectCode: projects.code,
        projectName: projects.name,
        activityId: activities.id,
        activityTitle: activities.title,
        targetValue: targets.targetValue,
      })
        .from(targets)
        .innerJoin(indicators, eq(targets.indicatorId, indicators.id))
        .innerJoin(projects, eq(indicators.projectId, projects.id))
        .leftJoin(activities, eq(indicators.activityId, activities.id))
        .where(eq(targets.year, financialYear)),
      db.select({
        targetId: results.targetId,
        actualValue: sql<string>`coalesce(sum(${results.actualValue}), 0)`,
      })
        .from(results)
        .where(sql`extract(year from ${results.periodStart}) = ${financialYear}`)
        .groupBy(results.targetId),
    ]);

    const actualByTarget = new Map(resultRows.map((row) => [row.targetId, toNumber(row.actualValue)]));
    const indicatorMap = new Map<string, {
      code: string; name: string; unit: string; level: string; projectId: string; projectCode: string; projectName: string;
      activityId: string | null; activityTitle: string | null; target: number; actual: number;
    }>();

    for (const row of targetRows) {
      const current = indicatorMap.get(row.indicatorId) ?? {
        code: row.indicatorCode, name: row.indicatorName, unit: row.unit, level: row.level,
        projectId: row.projectId, projectCode: row.projectCode, projectName: row.projectName,
        activityId: row.activityId, activityTitle: row.activityTitle, target: 0, actual: 0,
      };
      current.target += toNumber(row.targetValue);
      current.actual += actualByTarget.get(row.targetId) ?? 0;
      indicatorMap.set(row.indicatorId, current);
    }

    const projectMap = new Map<string, { projectCode: string; projectName: string; target: number; actual: number; indicators: number; achievedIndicators: number }>();
    for (const row of indicatorMap.values()) {
      const current = projectMap.get(row.projectId) ?? { projectCode: row.projectCode, projectName: row.projectName, target: 0, actual: 0, indicators: 0, achievedIndicators: 0 };
      current.target += row.target;
      current.actual += row.actual;
      current.indicators += 1;
      if (row.target > 0 && row.actual >= row.target) current.achievedIndicators += 1;
      projectMap.set(row.projectId, current);
    }

    const indicatorPerformance = [...indicatorMap.values()].map((row) => ({
      ...row,
      achievementPercent: row.target > 0 ? Number(((row.actual / row.target) * 100).toFixed(2)) : 0,
      gap: row.target - row.actual,
    }));
    const projectPerformance = [...projectMap.entries()].map(([projectId, row]) => ({
      projectId,
      ...row,
      achievementPercent: row.target > 0 ? Number(((row.actual / row.target) * 100).toFixed(2)) : 0,
      gap: row.target - row.actual,
    }));

    const attention = projectPerformance
      .filter((row) => row.target > 0)
      .map((row) => {
        const achievement = row.achievementPercent;
        if (achievement < 50) return {
          severity: "HIGH" as const,
          projectCode: row.projectCode,
          projectName: row.projectName,
          message: `Delivery is at ${achievement.toFixed(1)}% of the aggregated target while financial use must be reviewed alongside delivery.`,
          recommendation: "Review implementation constraints, activity status and the remaining delivery plan before further discretionary spend.",
          decision: "Decide whether to accelerate, revise scope/timing or reallocate resources.",
        };
        if (achievement < 80) return {
          severity: "MEDIUM" as const,
          projectCode: row.projectCode,
          projectName: row.projectName,
          message: `Delivery is at ${achievement.toFixed(1)}% of the aggregated target.`,
          recommendation: "Review the delivery gap and forecast whether planned resources can achieve the remaining target.",
          decision: "Decide whether corrective action or a revised delivery forecast is required.",
        };
        return null;
      }).filter(Boolean);

    return NextResponse.json({
      financialYear,
      basis: "Target achievement is calculated from approved target records for the selected year and recorded results whose period starts in that year.",
      projectPerformance,
      indicatorPerformance,
      attention,
    });
  } catch (error) {
    return apiError(error);
  }
}
