"use client";

import { useEffect, useMemo, useState } from "react";

type FinanceData = {
  currency: "ZMW";
  budgetApprovedZmw: number;
  expenditureZmw: number;
  remainingZmw: number;
  utilisationPercent: number;
  projects: Array<{ projectCode: string; projectName: string; programmeCode: string | null; budgetZmw: number; spentZmw: number; remainingZmw: number }>;
  categories: Array<{ category: string; spentZmw: number }>;
};

const money = (value: number) => new Intl.NumberFormat("en-ZM", { style: "currency", currency: "ZMW", maximumFractionDigits: 2 }).format(value);

export default function FinancialIntelligencePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/finance/dashboard", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Unable to load financial intelligence."); return response.json(); })
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const largestCategory = useMemo(() => data?.categories[0]?.category ?? "—", [data]);

  return (
    <main className="ims-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <a className="sidebar-link" href="/dashboard"><span className="nav-icon">⌂</span><span>Dashboard</span></a>
          <a className="sidebar-link" href="/dashboard/workflow#programmes"><span className="nav-icon">▣</span><span>Programmes</span></a>
          <a className="sidebar-link" href="/dashboard/workflow#projects"><span className="nav-icon">◫</span><span>Projects</span></a>
          <a className="sidebar-link" href="/dashboard/workflow#activities"><span className="nav-icon">✓</span><span>Activities</span></a>
          <a className="sidebar-link" href="/dashboard/workflow#reports"><span className="nav-icon">▤</span><span>Reports</span></a>
          <a className="sidebar-link active" href="/dashboard/finance"><span className="nav-icon">₭</span><span>Financial Intelligence</span></a>
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Financial Intelligence</strong></div><div className="top-actions"><span className="env-pill"><span /> Connected</span><div className="top-avatar">PA</div></div></header>
        <div className="page-content">
          <div className="title-bar"><div><p className="eyebrow">FINANCE</p><h1>Financial Intelligence</h1><p>Management visibility over approved budgets and recognised expenditure.</p></div><div className="title-actions"><span className="db-status"><span /> ZMW</span></div></div>
          {error ? <section className="panel" style={{ marginTop: 18, color: "#8a2b2b", fontSize: 16 }}>{error}</section> : !data ? <section className="panel" style={{ marginTop: 18, fontSize: 16 }}>Loading financial intelligence…</section> : <>
            <section className="stats-grid" aria-label="Financial metrics">
              <article className="metric-card metric-navy"><div className="metric-top"><span>APPROVED BUDGET</span><span className="metric-icon">₭</span></div><strong>{money(data.budgetApprovedZmw)}</strong><p>Approved budget</p><small>Authoritative approved budget records</small></article>
              <article className="metric-card metric-blue"><div className="metric-top"><span>EXPENDITURE</span><span className="metric-icon">↗</span></div><strong>{money(data.expenditureZmw)}</strong><p>Recognised expenditure</p><small>Approved and paid expenditure</small></article>
              <article className="metric-card metric-gold"><div className="metric-top"><span>REMAINING</span><span className="metric-icon">✓</span></div><strong>{money(data.remainingZmw)}</strong><p>Available balance</p><small>Approved budget less recognised expenditure</small></article>
              <article className="metric-card metric-light"><div className="metric-top"><span>UTILISATION</span><span className="metric-icon">%</span></div><strong>{data.utilisationPercent}%</strong><p>Budget utilisation</p><small>Expenditure as a share of approved budget</small></article>
            </section>
            <div className="dashboard-grid">
              <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">PROJECT FINANCE</p><h2>Budget position by project</h2></div></div><div className="activity-table">{data.projects.length === 0 ? <div className="more">No approved budgets have been recorded yet.</div> : data.projects.map((project) => <article className="activity-row" key={project.projectCode}><div className="activity-mark blue">₭</div><div className="activity-main"><strong>{project.projectCode} · {project.projectName}</strong><span>{project.programmeCode ?? "Programme"} · Budget {money(project.budgetZmw)} · Spent {money(project.spentZmw)}</span></div><span className="status blue">{project.budgetZmw === 0 ? "NO BUDGET" : `${Math.round((project.spentZmw / project.budgetZmw) * 100)}%`}</span><time>{money(project.remainingZmw)}</time></article>)}</div></section>
              <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">EXPENDITURE MIX</p><h2>Spend by category</h2></div></div><div className="notice-list">{data.categories.length === 0 ? <div className="more">No recognised expenditure has been recorded yet.</div> : data.categories.map((category) => <div key={category.category}><span className="notice-dot blue-dot" /><p><strong>{category.category}</strong><small>{money(category.spentZmw)}</small></p><b>{data.expenditureZmw === 0 ? "0%" : `${Math.round((category.spentZmw / data.expenditureZmw) * 100)}%`}</b></div>)}</div><div className="mini-metrics"><div><strong>{data.projects.length}</strong><span>Projects with finance records</span></div><div><strong>{data.categories.length}</strong><span>Expense categories</span></div><div><strong>{largestCategory}</strong><span>Largest category</span></div></div></section>
            </div>
          </>}
        </div>
      </section>
    </main>
  );
}
