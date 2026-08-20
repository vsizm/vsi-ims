"use client";

import { useEffect, useState } from "react";

type Action = { id: string; entityType: string; entityId: string; source: string; severity: string; finding: string; recommendation: string; decision: string | null; actionOwnerUserId: string | null; dueDate: string | null; status: string; resolution: string | null };

export default function FinanceActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch("/api/management-actions?status=OPEN", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Unable to load management actions."); return; }
    setActions(data.actions ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function update(id: string, payload: Record<string, unknown>) {
    setBusy(id); setError("");
    try {
      const response = await fetch(`/api/management-actions?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update action.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update action."); }
    finally { setBusy(""); }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header><p className="text-sm font-medium text-slate-500">Management control</p><h1 className="text-2xl font-semibold">Attention, Decisions & Actions</h1><p className="mt-1 text-sm text-slate-600">Turn financial and delivery intelligence into traceable management action.</p></header>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {actions.length === 0 ? <section className="rounded-lg border bg-white p-6 text-sm text-slate-600">No open management actions.</section> : actions.map((action) => (
        <section key={action.id} className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{action.source} · {action.entityType}</span><h2 className="mt-1 font-semibold">{action.finding}</h2></div><span className="rounded-full border px-3 py-1 text-xs font-semibold">{action.severity}</span></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase text-slate-500">Recommendation</p><p className="mt-1 text-sm">{action.recommendation}</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Decision</p><p className="mt-1 text-sm">{action.decision ?? "Decision required."}</p></div></div>
          <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy === action.id} onClick={() => update(action.id, { status: "IN_PROGRESS" })} className="rounded border px-3 py-2 text-sm">Start action</button><button disabled={busy === action.id} onClick={() => update(action.id, { status: "COMPLETED", resolution: "Completed by management workflow." })} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Mark resolved</button><button disabled={busy === action.id} onClick={() => update(action.id, { status: "CANCELLED", resolution: "Closed by management decision." })} className="rounded border px-3 py-2 text-sm">Close</button></div>
        </section>
      ))}
    </main>
  );
}
