"use client";

import { useState } from "react";

type FinanceProject = {
  projectCode: string;
  projectName: string;
  spentZmw: number;
  utilisationPercent: number;
};

type DeliveryProject = {
  projectId: string;
  projectCode: string;
  projectName: string;
  achievementPercent: number;
  gap: number;
};

type Props = {
  year: number;
  financeProjects: FinanceProject[];
  deliveryProjects: DeliveryProject[];
};

export default function ManagementSignalSync({ year, financeProjects, deliveryProjects }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function syncSignals() {
    setBusy(true);
    setMessage("");
    setError("");

    const financeByCode = new Map(financeProjects.map((row) => [row.projectCode, row]));
    const signals = deliveryProjects.flatMap((row) => {
      const financial = financeByCode.get(row.projectCode);
      const signalsForProject = [] as Array<Record<string, string | number>>;
      const utilisation = financial?.utilisationPercent ?? 0;

      if (row.achievementPercent < 50) {
        signalsForProject.push({
          entityType: "PROJECT",
          entityId: row.projectId,
          source: "DELIVERY_PERFORMANCE",
          sourceKey: `${year}:${row.projectCode}:delivery-low-achievement`,
          severity: "HIGH",
          finding: `${row.projectCode} delivery achievement is ${row.achievementPercent}% with a gap of ${row.gap}.`,
          recommendation: "Review implementation constraints, ownership and corrective actions for the project.",
          decision: "Determine corrective action and accountable owner.",
        });
      }

      if (utilisation >= 80 && row.achievementPercent < 50) {
        signalsForProject.push({
          entityType: "PROJECT",
          entityId: row.projectId,
          source: "FINANCIAL_DELIVERY",
          sourceKey: `${year}:${row.projectCode}:high-spend-low-delivery`,
          severity: "CRITICAL",
          finding: `${row.projectCode} has ${utilisation}% financial utilisation against ${row.achievementPercent}% delivery achievement.`,
          recommendation: "Inspect value for money, implementation performance and remaining resource requirements before further commitments.",
          decision: "Decide whether to intervene, reallocate resources or require a recovery plan.",
        });
      }

      return signalsForProject;
    });

    if (signals.length === 0) {
      setMessage("No new project-level attention signals were identified for this financial year.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/management-actions/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signals }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to create management findings.");
      setMessage(`${result.createdCount} new finding(s) created; ${result.skippedCount} existing finding(s) left unchanged.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create management findings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ marginTop: 18 }}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow dark">MANAGEMENT CONTROL</p>
          <h2>Convert attention into tracked findings</h2>
        </div>
        <button type="button" className="primary-button" onClick={syncSignals} disabled={busy}>
          {busy ? "Creating findings…" : "Create management findings"}
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--ink-muted)" }}>
        Uses the financial and delivery signals already calculated above. Existing active findings are not duplicated.
      </p>
      {message ? <p style={{ margin: "12px 0 0", color: "#245f43" }}>{message}</p> : null}
      {error ? <p style={{ margin: "12px 0 0", color: "#8a2b2b" }}>{error}</p> : null}
    </section>
  );
}
