"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ManagementSignalSync from "@/components/finance/management-signal-sync";

type Row = { code:string; name:string; directorateCode?:string|null; programmeCode?:string|null; budgetZmw:number; committedZmw:number; spentZmw:number; remainingZmw:number; utilisationPercent:number };
type Attention = { severity:"CRITICAL"|"HIGH"|"MEDIUM"; type:string; scope:string; code:string; name:string; message:string; recommendation:string; decision:string };
type ProjectPerformance = { projectId:string; projectCode:string; projectName:string; target:number; actual:number; indicators:number; achievedIndicators:number; achievementPercent:number; gap:number };
type PerformanceAttention = { severity:"HIGH"|"MEDIUM"; projectCode:string; projectName:string; message:string; recommendation:string; decision:string };
type FinanceData = { financialYear:number; budgetApprovedZmw:number; expenditureZmw:number; committedZmw:number; remainingZmw:number; uncommittedZmw:number; utilisationPercent:number; committedPercent:number; allocationSummary:{directorateBudgetZmw:number;programmeAllocationZmw:number;projectAllocationZmw:number;activityAllocationZmw:number}; attention:Attention[]; attentionSummary:{critical:number;high:number;medium:number}; directorates:Row[]; programmes:Row[]; projects:Array<Row&{projectCode:string;projectName:string;programmeCode:string|null;directorateCode:string|null}>; categories:Array<{category:string;spentZmw:number}> };
type PerformanceData = { financialYear:number; basis:string; projectPerformance:ProjectPerformance[]; indicatorPerformance:unknown[]; attention:PerformanceAttention[] };
type Budget = { id:string; level:string; financialYear:number; budgetCode:string; amountZmw:string; status:string; parentBudgetId:string|null; notes?:string|null };
type EditBudget = { id:string; budgetCode:string; amountZmw:string; notes:string };

const money = (value:number) => new Intl.NumberFormat("en-ZM", { style:"currency", currency:"ZMW", maximumFractionDigits:2 }).format(value);
const yearNow = new Date().getUTCFullYear();

export default function FinancialIntelligencePage() {
  const [year,setYear] = useState(yearNow);
  const [data,setData] = useState<FinanceData|null>(null);
  const [performance,setPerformance] = useState<PerformanceData|null>(null);
  const [budgets,setBudgets] = useState<Budget[]>([]);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [search,setSearch] = useState("");
  const [editBudget,setEditBudget] = useState<EditBudget|null>(null);
  const [busy,setBusy] = useState(false);

  const load = async () => {
    setData(null); setPerformance(null); setError(""); setMessage("");
    try {
      const [fr,pr,br] = await Promise.all([
        fetch(`/api/finance/dashboard?year=${year}`,{cache:"no-store"}),
        fetch(`/api/finance/performance?year=${year}`,{cache:"no-store"}),
        fetch("/api/finance/budgets",{cache:"no-store"}),
      ]);
      if (!fr.ok || !pr.ok || !br.ok) throw new Error("Unable to load financial and delivery intelligence.");
      const [f,p,b] = await Promise.all([fr.json(),pr.json(),br.json()]);
      setData(f); setPerformance(p); setBudgets(b.filter((x:Budget)=>x.financialYear===year));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load financial intelligence.");
    }
  };

  useEffect(()=>{ load(); },[year]);

  const largestCategory = useMemo(()=>data?.categories[0]?.category ?? "—",[data]);
  const projectFinancial = useMemo(()=>new Map((data?.projects??[]).map(row=>[row.projectCode,row])),[data]);
  const visibleBudgets = budgets.filter(b=>`${b.level} ${b.budgetCode} ${b.status}`.toLowerCase().includes(search.toLowerCase()));
  const severityLabel = (severity:Attention["severity"]) => severity === "CRITICAL" ? "Critical" : severity === "HIGH" ? "High" : "Review";

  async function budgetAction(id:string, action:"approve"|"delete") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(action === "approve" ? `/api/finance/budgets/${id}/approve` : `/api/finance/budgets/manage?id=${id}`, { method:action === "approve" ? "POST" : "DELETE" });
      const result = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(result.error || "Unable to complete budget action.");
      setMessage(action === "approve" ? "Budget approved." : "Draft budget deleted.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to complete budget action.");
    } finally { setBusy(false); }
  }

  function startEdit(budget:Budget) {
    setError(""); setMessage("");
    setEditBudget({ id:budget.id, budgetCode:budget.budgetCode, amountZmw:budget.amountZmw, notes:budget.notes ?? "" });
  }

  async function saveEdit(event:FormEvent) {
    event.preventDefault();
    if (!editBudget) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/finance/budgets/manage?id=${editBudget.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ budgetCode:editBudget.budgetCode, amountZmw:Number(editBudget.amountZmw), notes:editBudget.notes }) });
      const result = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(result.error || "Unable to update budget.");
      setEditBudget(null); setMessage("Draft budget updated."); await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update budget.");
    } finally { setBusy(false); }
  }

  return <main className="ims-shell">
    <aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div><div className="workspace-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Main navigation"><a className="sidebar-link" href="/dashboard">⌂ <span>Dashboard</span></a><a className="sidebar-link" href="/dashboard/directorates">▤ <span>Directorates</span></a><a className="sidebar-link" href="/dashboard/programmes">▣ <span>Programmes</span></a><a className="sidebar-link" href="/dashboard/projects">◫ <span>Projects</span></a><a className="sidebar-link" href="/dashboard/activities">✓ <span>Activities</span></a><a className="sidebar-link" href="/dashboard/reports">▤ <span>Reports</span></a><a className="sidebar-link active" href="/dashboard/finance">₭ <span>Financial Intelligence</span></a><a className="sidebar-link" href="/dashboard/volunteers">♙ <span>Volunteer Management</span></a></nav></aside>
    <section className="workspace"><header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Financial Intelligence</strong></div><div className="top-actions"><span className="env-pill"><span/> Connected</span><div className="top-avatar">PA</div></div></header>
      <div className="page-content"><div className="title-bar"><div><p className="eyebrow">FINANCE</p><h1>Financial Intelligence</h1><p>Budget, commitment, expenditure, delivery performance and management decisions from the governed hierarchy.</p></div><div className="title-actions"><a className="primary-button" href="/dashboard/directorates">+ New allocation</a><label className="db-status">Financial year<select value={year} onChange={e=>setYear(Number(e.target.value))}><option value={yearNow-1}>{yearNow-1}</option><option value={yearNow}>{yearNow}</option><option value={yearNow+1}>{yearNow+1}</option></select></label></div></div>
      {message && <div className="flash success">{message}</div>}{error && <div className="flash error">{error}</div>}
      {!data || !performance ? <section className="panel loading">Loading financial and delivery intelligence…</section> : <>
        <section className="stats-grid"><article className="metric-card metric-navy"><div className="metric-top"><span>DIRECTORATE BUDGET</span><span className="metric-icon">₭</span></div><strong>{money(data.budgetApprovedZmw)}</strong><p>Approved top-level budget</p><small>Child allocations are not double-counted.</small></article><article className="metric-card metric-blue"><div className="metric-top"><span>COMMITTED</span><span className="metric-icon">↗</span></div><strong>{money(data.committedZmw)}</strong><p>Committed expenditure</p><small>{data.committedPercent}% of top-level budget</small></article><article className="metric-card metric-gold"><div className="metric-top"><span>PAID</span><span className="metric-icon">✓</span></div><strong>{money(data.expenditureZmw)}</strong><p>Actual paid expenditure</p><small>{data.utilisationPercent}% budget utilisation</small></article><article className="metric-card metric-light"><div className="metric-top"><span>AVAILABLE</span><span className="metric-icon">%</span></div><strong>{money(data.remainingZmw)}</strong><p>Budget remaining</p><small>{money(data.uncommittedZmw)} not yet committed</small></article></section>

        <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">FINANCIAL × DELIVERY</p><h2>Resource use against results</h2></div><span className="more">FY {performance.financialYear}</span></div><p className="muted-note">{performance.basis}</p><div className="activity-table">{performance.projectPerformance.length===0?<div className="more">No targets and results are recorded for this year.</div>:performance.projectPerformance.map(row=>{const financial=projectFinancial.get(row.projectCode);const utilisation=financial?.utilisationPercent??0;const efficiency=utilisation===0?null:Number((row.achievementPercent/utilisation*100).toFixed(1));return <article className="activity-row" key={row.projectId}><div className={`activity-mark ${row.achievementPercent<50?"navy":"blue"}`}>↗</div><div className="activity-main"><strong>{row.projectCode} · {row.projectName}</strong><span>Delivery {row.achievementPercent}% · Target {row.target} · Actual {row.actual} · Gap {row.gap}</span><span>Financial use {utilisation}%{efficiency===null?"":` · delivery/spend index ${efficiency}%`}</span></div><span className={`status ${row.achievementPercent<50?"red":row.achievementPercent<80?"gold":"blue"}`}>{row.achievementPercent}%</span><time>{financial?money(financial.spentZmw):"No spend"}</time></article>})}</div></section>

        <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">ALLOCATION CONTROL</p><h2>Budget register</h2><p className="panel-subtitle">One governed register for Directorate, Programme, Project and Activity allocations.</p></div><span className="more">{visibleBudgets.length} FY {year} records</span></div><div className="toolbar"><input className="search" placeholder="Search budget code, level or status…" value={search} onChange={e=>setSearch(e.target.value)}/><a className="ims-action" href="/dashboard/directorates">Manage allocations →</a></div><div className="budget-grid">{visibleBudgets.length===0?<div className="more">No budget records for FY {year}. Use Manage allocations to establish the Directorate envelope first.</div>:visibleBudgets.map(b=><article className="budget-card" key={b.id}><div className="budget-card-top"><span className="budget-level">{b.level}</span><span className={`budget-status ${b.status.toLowerCase()}`}>{b.status}</span></div><h3>{b.budgetCode}</h3><strong>{money(Number(b.amountZmw))}</strong><small>FY {b.financialYear}</small>{b.parentBudgetId&&<small>Parent allocation linked</small>}{b.status==="DRAFT"&&<div className="actions"><button className="ims-action soft" type="button" onClick={()=>startEdit(b)}>Edit</button><button className="ims-action" type="button" disabled={busy} onClick={()=>budgetAction(b.id,"approve")}>Approve</button><button className="ims-action danger" type="button" disabled={busy} onClick={()=>budgetAction(b.id,"delete")}>Delete</button></div>}</article>)}</div></section>

        <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">DELIVERY ATTENTION</p><h2>What requires attention</h2></div><span className="more">{performance.attention.length} delivery signals</span></div>{performance.attention.length===0?<div className="notice-list"><div><span className="notice-dot blue-dot"/><p><strong>No delivery attention signals</strong><small>All projects with recorded targets are at or above the review threshold.</small></p><b>OK</b></div></div>:<div className="notice-list">{performance.attention.slice(0,12).map((item,index)=><div key={`${item.projectCode}-${index}`}><span className="notice-dot"/><p><strong>{item.severity==="HIGH"?"High":"Review"} · {item.projectCode} · {item.projectName}</strong><small>{item.message}</small><small><b>Recommendation:</b> {item.recommendation}</small><small><b>Decision:</b> {item.decision}</small></p><b>{item.severity}</b></div>)}</div>}</section>

        <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">FINANCIAL ATTENTION</p><h2>What requires financial action</h2></div><span className="more">{data.attentionSummary.critical} critical · {data.attentionSummary.high} high · {data.attentionSummary.medium} review</span></div>{data.attention.length===0?<div className="notice-list"><div><span className="notice-dot blue-dot"/><p><strong>No financial attention signals</strong><small>No threshold-based financial exception was detected for FY {data.financialYear}.</small></p><b>OK</b></div></div>:<div className="notice-list">{data.attention.slice(0,12).map((item,index)=><div key={`${item.scope}-${item.code}-${item.type}-${index}`}><span className="notice-dot"/><p><strong>{severityLabel(item.severity)} · {item.scope} · {item.code}</strong><small>{item.message}</small><small><b>Recommendation:</b> {item.recommendation}</small><small><b>Decision:</b> {item.decision}</small></p><b>{item.severity}</b></div>)}</div>}</section>

        <ManagementSignalSync year={year} financeProjects={data.projects} deliveryProjects={performance.projectPerformance}/>

        <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">ALLOCATION CONTROL</p><h2>Budget flowing down the organisation</h2></div><span className="more">FY {data.financialYear}</span></div><div className="mini-metrics"><div><strong>{money(data.allocationSummary.directorateBudgetZmw)}</strong><span>Directorate budget</span></div><div><strong>{money(data.allocationSummary.programmeAllocationZmw)}</strong><span>Programme allocations</span></div><div><strong>{money(data.allocationSummary.projectAllocationZmw)}</strong><span>Project allocations</span></div><div><strong>{money(data.allocationSummary.activityAllocationZmw)}</strong><span>Activity allocations</span></div></div></section>

        <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">DIRECTORATE POSITION</p><h2>Directorates</h2></div></div><div className="activity-table">{data.directorates.length===0?<div className="more">No approved Directorate budgets for this year.</div>:data.directorates.map(row=><article className="activity-row" key={row.code}><div className="activity-mark navy">₭</div><div className="activity-main"><strong>{row.code} · {row.name}</strong><span>Budget {money(row.budgetZmw)} · Committed {money(row.committedZmw)} · Paid {money(row.spentZmw)}</span></div><span className="status blue">{row.utilisationPercent}%</span><time>{money(row.remainingZmw)}</time></article>)}</div></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">PROGRAMME POSITION</p><h2>Programmes</h2></div></div><div className="activity-table">{data.programmes.length===0?<div className="more">No approved Programme allocations for this year.</div>:data.programmes.map(row=><article className="activity-row" key={row.code}><div className="activity-mark blue">₭</div><div className="activity-main"><strong>{row.code} · {row.name}</strong><span>{row.directorateCode??"Directorate"} · Budget {money(row.budgetZmw)} · Paid {money(row.spentZmw)}</span></div><span className="status blue">{row.utilisationPercent}%</span><time>{money(row.remainingZmw)}</time></article>)}</div></section></div>
        <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">PROJECT POSITION</p><h2>Projects</h2></div></div><div className="activity-table">{data.projects.length===0?<div className="more">No approved Project budgets for this year.</div>:data.projects.map(row=><article className="activity-row" key={row.projectCode}><div className="activity-mark blue">₭</div><div className="activity-main"><strong>{row.projectCode} · {row.projectName}</strong><span>{row.directorateCode??"Directorate"} · {row.programmeCode??"Programme"} · Budget {money(row.budgetZmw)} · Committed {money(row.committedZmw)} · Paid {money(row.spentZmw)}</span></div><span className="status blue">{row.utilisationPercent}%</span><time>{money(row.remainingZmw)}</time></article>)}</div></section>
        <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">EXPENDITURE MIX</p><h2>Paid expenditure by category</h2></div></div><div className="notice-list">{data.categories.length===0?<div className="more">No paid expenditure recorded for this year.</div>:data.categories.map(category=><div key={category.category}><span className="notice-dot blue-dot"/><p><strong>{category.category}</strong><small>{money(category.spentZmw)}</small></p><b>{data.expenditureZmw===0?"0%":`${Math.round(category.spentZmw/data.expenditureZmw*100)}%`}</b></div>)}</div></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">POSITION</p><h2>Management view</h2></div></div><div className="mini-metrics"><div><strong>{data.directorates.length}</strong><span>Directorates</span></div><div><strong>{data.programmes.length}</strong><span>Programmes funded</span></div><div><strong>{data.projects.length}</strong><span>Projects funded</span></div><div><strong>{largestCategory}</strong><span>Largest spend category</span></div></div><p className="muted-note">Attention signals are decision support. They identify exceptions and recommended actions; authorised management makes the decision.</p></section></div>
      </>}
      </div>
    </section>

    {editBudget && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-budget-title"><div className="panel-heading"><div><p className="eyebrow dark">ALLOCATION CONTROL</p><h2 id="edit-budget-title">Edit draft budget</h2></div><button className="modal-close" type="button" onClick={()=>setEditBudget(null)}>×</button></div><form className="edit-form" onSubmit={saveEdit}><label>Budget code<input required value={editBudget.budgetCode} onChange={e=>setEditBudget({...editBudget,budgetCode:e.target.value})}/></label><label>Amount (ZMW)<input required type="number" min="0.01" step="0.01" value={editBudget.amountZmw} onChange={e=>setEditBudget({...editBudget,amountZmw:e.target.value})}/></label><label>Notes<textarea value={editBudget.notes} onChange={e=>setEditBudget({...editBudget,notes:e.target.value})}/></label><div className="form-actions"><button className="ims-action soft" type="button" onClick={()=>setEditBudget(null)}>Cancel</button><button className="ims-action" type="submit" disabled={busy}>{busy?"Saving…":"Save changes"}</button></div></form></section></div>}

    <style jsx>{`.flash{margin:16px 0;padding:10px 14px;border-radius:9px;font-size:.82rem;font-weight:750}.flash.success{background:#edf8f2;color:#16744d}.flash.error{background:#faeded;color:#8a2b2b}.loading{margin-top:18px;font-size:16px}.panel-subtitle,.muted-note{color:var(--ink-muted);font-size:.78rem;margin:5px 0 0}.panel-actions{display:flex;align-items:center;gap:12px}.toolbar{display:flex;gap:10px;margin:14px 0;align-items:center}.search{width:100%;max-width:460px;border:1px solid var(--line);border-radius:8px;padding:10px;font:inherit}.budget-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.budget-card{padding:16px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(180deg,#fff,#fbfcfd);box-shadow:0 5px 16px rgba(15,47,74,.06)}.budget-card-top{display:flex;justify-content:space-between;gap:8px}.budget-level,.budget-status{font-size:.65rem;font-weight:900}.budget-level{color:var(--baltic-blue)}.budget-status{padding:5px 8px;border-radius:999px;background:#eef2f5;color:#657684}.budget-status.approved{background:#e7f6ed;color:#177448}.budget-status.closed{background:#f5e8e8;color:#8f3333}.budget-card h3{margin:12px 0 5px;color:var(--regal-navy);font-size:.9rem}.budget-card strong{display:block;color:var(--regal-navy);font-size:1.05rem}.budget-card small{display:block;margin-top:4px;color:var(--muted)}.ims-action{border:0;border-radius:7px;padding:8px 11px;font-size:.7rem;font-weight:800;cursor:pointer;background:var(--regal-navy);color:#fff;text-decoration:none}.ims-action.soft{background:#e9f0f5;color:var(--regal-navy)}.ims-action.danger{background:#f5e8e8;color:#9b2f2f}.ims-action:disabled{opacity:.55;cursor:not-allowed}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.modal-backdrop{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:20px;background:rgba(0,35,66,.42);backdrop-filter:blur(3px)}.modal{width:min(560px,100%);background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 24px 70px rgba(0,35,66,.22)}.modal-close{border:0;background:#eef3f6;color:var(--regal-navy);border-radius:8px;width:34px;height:34px;font-size:20px;cursor:pointer}.edit-form{display:grid;gap:12px;margin-top:16px}.edit-form label{display:grid;gap:6px;font-size:.75rem;font-weight:850;color:var(--regal-navy)}.edit-form input,.edit-form textarea{border:1px solid var(--line);border-radius:8px;padding:10px;font:inherit}.edit-form textarea{min-height:90px;resize:vertical}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}@media(max-width:1000px){.budget-grid{grid-template-columns:1fr 1fr}}@media(max-width:700px){.budget-grid{grid-template-columns:1fr}.toolbar{align-items:stretch;flex-direction:column}.toolbar .ims-action{width:max-content}.title-actions{flex-wrap:wrap}}`}</style>
  </main>;
}
