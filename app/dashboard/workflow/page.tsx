"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Row = Record<string, unknown>;

const initialProgramme = { code: "", name: "", objective: "" };
const initialProject = { programmeId: "", code: "", name: "", objective: "" };
const initialActivity = { projectId: "", title: "", description: "", dueDate: "" };
const initialReport = { projectId: "", periodStart: "", periodEnd: "", narrative: "" };
const initialIndicator = { projectId: "", activityId: "", code: "", name: "", description: "", level: "OUTPUT", unit: "COUNT" };
const initialTarget = { indicatorId: "", year: String(new Date().getFullYear()), targetValue: "", provinceId: "", districtId: "", notes: "" };
const initialResult = { targetId: "", periodStart: "", periodEnd: "", actualValue: "", notes: "" };

export default function WorkflowPage() {
  const [programmes, setProgrammes] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);
  const [indicators, setIndicators] = useState<Row[]>([]);
  const [targets, setTargets] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [programme, setProgramme] = useState(initialProgramme);
  const [project, setProject] = useState(initialProject);
  const [activity, setActivity] = useState(initialActivity);
  const [report, setReport] = useState(initialReport);
  const [indicator, setIndicator] = useState(initialIndicator);
  const [target, setTarget] = useState(initialTarget);
  const [result, setResult] = useState(initialResult);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function refresh() {
    const [p, pr, a, r, i, t, re] = await Promise.all([
      api("/api/programmes"),
      api("/api/projects"),
      api("/api/activities"),
      api("/api/reports"),
      api("/api/indicators"),
      api("/api/targets"),
      api("/api/results")
    ]);
    setProgrammes(p);
    setProjects(pr);
    setActivities(a);
    setReports(r);
    setIndicators(i);
    setTargets(t);
    setResults(re);
    if (!project.programmeId && p[0]?.id) setProject((v) => ({ ...v, programmeId: String(p[0].id) }));
    if (!activity.projectId && pr[0]?.id) setActivity((v) => ({ ...v, projectId: String(pr[0].id) }));
    if (!report.projectId && pr[0]?.id) setReport((v) => ({ ...v, projectId: String(pr[0].id) }));
  }

  useEffect(() => { refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load the workflow.")); }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); await refresh(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  }

  async function createProgramme(event: FormEvent) { event.preventDefault(); await run(() => api("/api/programmes", { method: "POST", body: JSON.stringify(programme) }), "Programme created."); setProgramme(initialProgramme); }
  async function createProject(event: FormEvent) { event.preventDefault(); await run(() => api("/api/projects", { method: "POST", body: JSON.stringify(project) }), "Project created."); }
  async function createActivity(event: FormEvent) { event.preventDefault(); await run(() => api("/api/activities", { method: "POST", body: JSON.stringify(activity) }), "Activity created."); }
  async function createReport(event: FormEvent) {
    event.preventDefault();
    await run(() => api("/api/reports", {
      method: "POST",
      body: JSON.stringify(report)
    }), "Report created.");
  }

  async function createIndicator(event: FormEvent) {
    event.preventDefault();
    await run(() => api("/api/indicators", {
      method: "POST",
      body: JSON.stringify({
        ...indicator,
        activityId: indicator.activityId || undefined,
        description: indicator.description || undefined
      })
    }), "Indicator created.");
    setIndicator(initialIndicator);
  }

  async function createTarget(event: FormEvent) {
    event.preventDefault();
    await run(() => api("/api/targets", {
      method: "POST",
      body: JSON.stringify({
        ...target,
        year: Number(target.year),
        targetValue: Number(target.targetValue),
        provinceId: target.provinceId || undefined,
        districtId: target.districtId || undefined,
        notes: target.notes || undefined
      })
    }), "Target created.");
    setTarget(initialTarget);
  }

  async function createResult(event: FormEvent) {
    event.preventDefault();
    await run(() => api("/api/results", {
      method: "POST",
      body: JSON.stringify({
        ...result,
        actualValue: Number(result.actualValue),
        notes: result.notes || undefined
      })
    }), "Result recorded.");
    setResult(initialResult);
  }

  const actionActivity = selectedActivity || String(activities[0]?.id || "");
  const selectedTarget = targets.find((item) => String(item.id) === result.targetId);

  return (
    <main className="ims-shell">
      <style>{`.workflow-page{max-width:1500px}.workflow-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:18px}.flow-card{background:#fff;border:1px solid var(--line);border-radius:13px;padding:22px;box-shadow:var(--shadow);position:relative;overflow:hidden}.flow-card:before{content:"";position:absolute;left:0;top:0;width:4px;height:100%;background:var(--baltic-blue)}.flow-card.approval:before{background:var(--school-bus-yellow)}.flow-card.report:before{background:var(--regal-navy)}.flow-card h2{margin:0;color:var(--regal-navy);font-size:1.02rem}.flow-head{display:flex;justify-content:space-between;gap:15px;align-items:start;margin-bottom:15px}.flow-number{width:32px;height:32px;border-radius:9px;background:#e8f0f6;color:var(--regal-navy);display:grid;place-items:center;font-size:.61rem;font-weight:900}.flow-card form{display:grid;gap:10px}.workflow-page label{display:grid;gap:5px;color:var(--regal-navy);font-size:.6rem;font-weight:850}.workflow-page input,.workflow-page select,.workflow-page textarea{width:100%;border:1px solid #cddbe5;background:#fbfdfe;border-radius:7px;padding:9px 10px;color:var(--ink);font:inherit;font-size:.68rem;outline:none}.workflow-page textarea{min-height:68px;resize:vertical}.two-field{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.workflow-page input:focus,.workflow-page select:focus,.workflow-page textarea:focus{border-color:var(--baltic-blue);box-shadow:0 0 0 3px rgba(60,105,151,.1)}.form-button{border:0;border-radius:7px;padding:10px 13px;background:var(--regal-navy);color:#fff;font-size:.66rem;font-weight:900;cursor:pointer}.form-button:disabled,.action-row button:disabled{opacity:.5;cursor:not-allowed}.record-list{display:grid;gap:6px;margin-top:15px}.record-list>div{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 9px;background:var(--pale);border-radius:7px}.record-list strong{font-size:.55rem;color:var(--regal-navy)}.record-list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.58rem}.record-list button{border:0;background:transparent;color:#a44a4a;font-size:.55rem;font-weight:800;cursor:pointer}.approval-status{margin:14px 0;padding:13px;border-radius:8px;background:var(--pale);color:var(--regal-navy);font-size:.7rem;font-weight:900}.action-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.action-row button{border:0;border-radius:7px;padding:10px 8px;background:var(--baltic-blue);color:#fff;font-size:.61rem;font-weight:900;cursor:pointer}.action-row button:nth-child(2){background:var(--success)}.action-row button.reject{background:#a34d4d}.flash{margin-top:14px;padding:11px 13px;border-radius:8px;background:#edf8f2;color:#16744d;border:1px solid #c9ead9;font-size:.66rem;font-weight:800}.flash.error{background:#fff0f0;color:#a33d3d;border-color:#f0cccc}@media(max-width:900px){.workflow-grid{grid-template-columns:1fr}}@media(max-width:600px){.flow-card{padding:18px}.action-row{grid-template-columns:1fr}.two-field{grid-template-columns:1fr}}`}</style>
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav"><Link className="sidebar-link" href="/dashboard"><span className="nav-icon">⌂</span><span>Dashboard</span></Link><Link className="sidebar-link active" href="/dashboard/workflow"><span className="nav-icon">✓</span><span>V1 Workflow</span><b>LIVE</b></Link></nav>
        <div className="sidebar-divider" /><div className="workspace-label">V1 SCOPE</div>
        <div className="scope-list"><span>01 · Authenticate</span><span>02 · Programme</span><span>03 · Project</span><span>04 · Activity</span><span>05 · Approval</span><span>06 · Report</span><span>07 · Indicator</span><span>08 · Target</span><span>09 · Result</span></div>
      </aside>
      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>V1 Workflow</strong></div><div className="top-actions"><span className="env-pill"><span /> Authenticated</span><div className="top-avatar">VSI</div></div></header>
        <div className="page-content workflow-page">
          <div className="title-bar"><div><p className="eyebrow">VSI FOUNDATION · V1 DELIVERY</p><h1>V1 governed workflow</h1><p>Programme → Project → Activity → Approval → Report → Indicator → Target → Result.</p></div><Link className="primary-button" href="/dashboard">← Dashboard</Link></div>
          {message && <div className="flash">{message}</div>}
          <div className="workflow-grid">
            <section className="flow-card" id="programmes"><div className="flow-head"><div><p className="eyebrow dark">02 · PROGRAMME</p><h2>Create programme</h2></div><div className="flow-number">02</div></div><form onSubmit={createProgramme}><label>Code<input value={programme.code} onChange={(e) => setProgramme({ ...programme, code: e.target.value })} required /></label><label>Name<input value={programme.name} onChange={(e) => setProgramme({ ...programme, name: e.target.value })} required /></label><label>Objective<textarea value={programme.objective} onChange={(e) => setProgramme({ ...programme, objective: e.target.value })} required /></label><button className="form-button" disabled={busy}>Create programme</button></form><div className="record-list">{programmes.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.code)}</strong><span>{String(item.name)}</span><button onClick={() => run(() => api(`/api/programmes/${item.id}`, { method: "DELETE" }), "Programme deleted.")}>Delete</button></div>)}</div></section>
            <section className="flow-card" id="projects"><div className="flow-head"><div><p className="eyebrow dark">03 · PROJECT</p><h2>Create project</h2></div><div className="flow-number">03</div></div><form onSubmit={createProject}><label>Programme<select value={project.programmeId} onChange={(e) => setProject({ ...project, programmeId: e.target.value })} required><option value="">Select programme</option>{programmes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label><label>Code<input value={project.code} onChange={(e) => setProject({ ...project, code: e.target.value })} required /></label><label>Name<input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} required /></label><label>Objective<textarea value={project.objective} onChange={(e) => setProject({ ...project, objective: e.target.value })} required /></label><button className="form-button" disabled={busy}>Create project</button></form><div className="record-list">{projects.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.code)}</strong><span>{String(item.name)}</span><button onClick={() => run(() => api(`/api/projects/${item.id}`, { method: "DELETE" }), "Project deleted.")}>Delete</button></div>)}</div></section>
            <section className="flow-card" id="activities"><div className="flow-head"><div><p className="eyebrow dark">04 · ACTIVITY</p><h2>Create activity</h2></div><div className="flow-number">04</div></div><form onSubmit={createActivity}><label>Project<select value={activity.projectId} onChange={(e) => setActivity({ ...activity, projectId: e.target.value })} required><option value="">Select project</option>{projects.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label><label>Title<input value={activity.title} onChange={(e) => setActivity({ ...activity, title: e.target.value })} required /></label><label>Description<textarea value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} /></label><label>Due date<input type="date" value={activity.dueDate} onChange={(e) => setActivity({ ...activity, dueDate: e.target.value })} /></label><button className="form-button" disabled={busy}>Create activity</button></form><div className="record-list">{activities.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.approvalStatus)}</strong><span>{String(item.title)}</span><button onClick={() => run(() => api(`/api/activities/${item.id}`, { method: "DELETE" }), "Activity deleted.")}>Delete</button></div>)}</div></section>
            <section className="flow-card approval" id="approval"><div className="flow-head"><div><p className="eyebrow dark">05 · APPROVAL</p><h2>Submit / approve / reject</h2></div><div className="flow-number">05</div></div><label>Activity<select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)}><option value="">Select activity</option>{activities.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.title)}</option>)}</select></label>{actionActivity && <div className="approval-status">{String(activities.find((item) => String(item.id) === actionActivity)?.approvalStatus || "DRAFT")}</div>}<label>Rejection reason<textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Required when rejecting" /></label><div className="action-row"><button disabled={!actionActivity || busy} onClick={() => run(() => api(`/api/activities/${actionActivity}/submit`, { method: "POST" }), "Activity submitted.")}>Submit</button><button disabled={!actionActivity || busy} onClick={() => run(() => api(`/api/activities/${actionActivity}/approve`, { method: "POST" }), "Activity approved.")}>Approve</button><button className="reject" disabled={!actionActivity || busy || !rejectionReason.trim()} onClick={() => run(() => api(`/api/activities/${actionActivity}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectionReason }) }), "Activity rejected.")}>Reject</button></div></section>
            <section className="flow-card report" id="reports"><div className="flow-head"><div><p className="eyebrow dark">06 · REPORT</p><h2>Create / read report</h2></div><div className="flow-number">06</div></div><form onSubmit={createReport}><label>Project<select value={report.projectId} onChange={(e) => setReport({ ...report, projectId: e.target.value })} required><option value="">Select project</option>{projects.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label><label>Period start<input type="date" value={report.periodStart} onChange={(e) => setReport({ ...report, periodStart: e.target.value })} required /></label><label>Period end<input type="date" value={report.periodEnd} onChange={(e) => setReport({ ...report, periodEnd: e.target.value })} required /></label><label>Narrative<textarea value={report.narrative} onChange={(e) => setReport({ ...report, narrative: e.target.value })} required /></label><button className="form-button" disabled={busy}>Create report</button></form><div className="record-list">{reports.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.periodStart)}</strong><span>{String(item.narrative).slice(0,70)}</span><button onClick={() => run(() => api(`/api/reports/${item.id}`, { method: "DELETE" }), "Report deleted.")}>Delete</button></div>)}</div></section>
            <section className="flow-card" id="indicators">
              <div className="flow-head"><div><p className="eyebrow dark">07 · INDICATOR</p><h2>Create indicator</h2></div><div className="flow-number">07</div></div>
              <form onSubmit={createIndicator}>
                <label>Project<select value={indicator.projectId} onChange={(e) => setIndicator({ ...indicator, projectId: e.target.value, activityId: "" })} required><option value="">Select project</option>{projects.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label>
                <label>Activity<select value={indicator.activityId} onChange={(e) => setIndicator({ ...indicator, activityId: e.target.value })} disabled={!indicator.projectId}><option value="">Project-level indicator</option>{activities.filter((item) => String(item.projectId) === indicator.projectId).map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.title)}</option>)}</select></label>
                <label>Code<input value={indicator.code} onChange={(e) => setIndicator({ ...indicator, code: e.target.value })} placeholder="IND-001" required /></label>
                <label>Name<input value={indicator.name} onChange={(e) => setIndicator({ ...indicator, name: e.target.value })} required /></label>
                <label>Description<textarea value={indicator.description} onChange={(e) => setIndicator({ ...indicator, description: e.target.value })} /></label>
                <div className="two-field">
                  <label>Level<select value={indicator.level} onChange={(e) => setIndicator({ ...indicator, level: e.target.value })}><option value="OUTPUT">OUTPUT</option><option value="OUTCOME">OUTCOME</option></select></label>
                  <label>Unit<select value={indicator.unit} onChange={(e) => setIndicator({ ...indicator, unit: e.target.value })}><option value="COUNT">COUNT</option><option value="PERCENTAGE">PERCENTAGE</option><option value="RATE">RATE</option><option value="OTHER">OTHER</option></select></label>
                </div>
                <button className="form-button" disabled={busy}>Create indicator</button>
              </form>
              <div className="record-list">{indicators.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.code)}</strong><span>{String(item.name)} · {String(item.unit)}</span><button onClick={() => run(() => api(`/api/indicators/${item.id}`, { method: "DELETE" }), "Indicator deleted.")}>Delete</button></div>)}</div>
            </section>

            <section className="flow-card" id="targets">
              <div className="flow-head"><div><p className="eyebrow dark">08 · TARGET</p><h2>Set target</h2></div><div className="flow-number">08</div></div>
              <form onSubmit={createTarget}>
                <label>Indicator<select value={target.indicatorId} onChange={(e) => setTarget({ ...target, indicatorId: e.target.value })} required><option value="">Select indicator</option>{indicators.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label>
                <div className="two-field">
                  <label>Year<input type="number" min="2000" max="2100" value={target.year} onChange={(e) => setTarget({ ...target, year: e.target.value })} required /></label>
                  <label>Target value<input type="number" min="0" step="0.01" value={target.targetValue} onChange={(e) => setTarget({ ...target, targetValue: e.target.value })} required /></label>
                </div>
                <label>Province code<input value={target.provinceId} onChange={(e) => setTarget({ ...target, provinceId: e.target.value })} placeholder="e.g. CBSLY" /></label>
                <label>District code<input value={target.districtId} onChange={(e) => setTarget({ ...target, districtId: e.target.value })} placeholder="e.g. LNSH" /></label>
                <label>Notes<textarea value={target.notes} onChange={(e) => setTarget({ ...target, notes: e.target.value })} /></label>
                <button className="form-button" disabled={busy || !target.indicatorId}>Set target</button>
              </form>
              <div className="record-list">{targets.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.year)}</strong><span>{String(item.indicatorCode)} · {String(item.targetValue)}</span><button onClick={() => run(() => api(`/api/targets/${item.id}`, { method: "DELETE" }), "Target deleted.")}>Delete</button></div>)}</div>
            </section>

            <section className="flow-card report" id="results">
              <div className="flow-head"><div><p className="eyebrow dark">09 · RESULT</p><h2>Record actual performance</h2></div><div className="flow-number">09</div></div>
              <form onSubmit={createResult}>
                <label>Target<select value={result.targetId} onChange={(e) => setResult({ ...result, targetId: e.target.value })} required><option value="">Select target</option>{targets.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.indicatorCode)} · {String(item.year)} · {String(item.targetValue)}</option>)}</select></label>
                {selectedTarget && <div className="approval-status">Target: {String(selectedTarget.indicatorCode)} · {String(selectedTarget.targetValue)}</div>}
                <div className="two-field">
                  <label>Period start<input type="date" value={result.periodStart} onChange={(e) => setResult({ ...result, periodStart: e.target.value })} required /></label>
                  <label>Period end<input type="date" value={result.periodEnd} onChange={(e) => setResult({ ...result, periodEnd: e.target.value })} required /></label>
                </div>
                <label>Actual value<input type="number" min="0" step="0.01" value={result.actualValue} onChange={(e) => setResult({ ...result, actualValue: e.target.value })} required /></label>
                <label>Notes<textarea value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} /></label>
                <button className="form-button" disabled={busy || !result.targetId}>Record result</button>
              </form>
              <div className="record-list">{results.slice(0,4).map((item) => <div key={String(item.id)}><strong>{String(item.actualValue)}</strong><span>{String(item.indicatorCode)} · {String(item.periodStart)} → {String(item.periodEnd)}</span><button onClick={() => run(() => api(`/api/results/${item.id}`, { method: "DELETE" }), "Result deleted.")}>Delete</button></div>)}</div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
