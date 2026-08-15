"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const roles = ["PROGRAMME_MANAGER", "PROJECT_MANAGER", "EXECUTIVE_DIRECTOR", "SYSTEM_ADMINISTRATOR"];

type Row = Record<string, unknown>;

export default function WorkflowPage() {
  const [apiKey, setApiKey] = useState("");
  const [role, setRole] = useState("PROGRAMME_MANAGER");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [programmes, setProgrammes] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [activities, setActivities] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);
  const [programme, setProgramme] = useState({ code: "EYE-01", name: "Education & Youth Empowerment", objective: "Improve access to education and youth development opportunities." });
  const [project, setProject] = useState({ programmeId: "", code: "EYE-P01", name: "School Outreach Initiative", objective: "Coordinate outreach activities with schools and community partners." });
  const [activity, setActivity] = useState({ projectId: "", title: "School outreach planning", description: "Plan the first school outreach cycle.", dueDate: "2026-08-18" });
  const [report, setReport] = useState({ projectId: "", periodStart: "2026-07-01", periodEnd: "2026-09-30", narrative: "Quarterly progress report covering programme delivery, activity progress and next actions." });
  const [selectedActivity, setSelectedActivity] = useState("");
  const [rejectionReason, setRejectionReason] = useState("Needs clearer delivery evidence before approval.");

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-vsi-role": role,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function refresh() {
    const [p, pr, a, r] = await Promise.all([
      api("/api/programmes"), api("/api/projects"), api("/api/activities"), api("/api/reports")
    ]);
    setProgrammes(p); setProjects(pr); setActivities(a); setReports(r);
    if (!project.programmeId && p[0]?.id) setProject((v) => ({ ...v, programmeId: String(p[0].id) }));
    if (!activity.projectId && pr[0]?.id) setActivity((v) => ({ ...v, projectId: String(pr[0].id) }));
    if (!report.projectId && pr[0]?.id) setReport((v) => ({ ...v, projectId: String(pr[0].id) }));
  }

  async function connect() {
    if (!apiKey.trim()) return setMessage("Enter the VSI internal API key to connect.");
    setBusy(true); setMessage("");
    try { await refresh(); setConnected(true); setMessage("Connected. The workspace is ready for the V1 workflow."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to connect."); }
    finally { setBusy(false); }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await action(); await refresh(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  }

  async function createProgramme(event: FormEvent) {
    event.preventDefault(); await runAction(() => api("/api/programmes", { method: "POST", body: JSON.stringify(programme) }), "Programme created.");
  }
  async function createProject(event: FormEvent) {
    event.preventDefault(); await runAction(() => api("/api/projects", { method: "POST", body: JSON.stringify(project) }), "Project created against the selected programme.");
  }
  async function createActivity(event: FormEvent) {
    event.preventDefault(); await runAction(() => api("/api/activities", { method: "POST", body: JSON.stringify(activity) }), "Activity created.");
  }
  async function createReport(event: FormEvent) {
    event.preventDefault(); await runAction(() => api("/api/reports", { method: "POST", body: JSON.stringify(report) }), "Report created.");
  }

  const actionActivity = selectedActivity || String(activities[0]?.id || "");

  return (
    <main className="ims-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav"><Link className="sidebar-link" href="/dashboard"><span className="nav-icon">⌂</span><span>Dashboard</span></Link><Link className="sidebar-link active" href="/dashboard/workflow"><span className="nav-icon">✓</span><span>V1 Workflow</span><b>LIVE</b></Link></nav>
        <div className="sidebar-divider" /><div className="workspace-label">V1 SCOPE</div>
        <div className="scope-list"><span>01 · Programme</span><span>02 · Project</span><span>03 · Activity</span><span>04 · Approval</span><span>05 · Report</span></div>
        <div className="sidebar-bottom"><div className="user-card"><div className="avatar">PA</div><div><strong>Programme Admin</strong><span>VSI Foundation</span></div></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>V1 Workflow</strong></div><div className="top-actions"><span className="env-pill"><span /> Development</span><div className="top-avatar">PA</div></div></header>
        <div className="page-content workflow-page">
          <div className="title-bar workflow-hero"><div><p className="eyebrow">VSI FOUNDATION · V1 DELIVERY</p><h1>Build the first governed workflow.</h1><p>Create the records, move an activity through approval, then create and read the report.</p></div><Link className="primary-button" href="/dashboard">← Dashboard</Link></div>

          <section className="access-panel">
            <div><p className="eyebrow dark">01 · AUTHENTICATE</p><h2>Demo access</h2><p>Use the existing VSI internal API authentication for the V1 demonstration.</p></div>
            <div className="access-form"><label>Internal API key<input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="VSI_INTERNAL_API_KEY" /></label><label>Role<select value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label><button className="primary-button" onClick={connect} disabled={busy}>{busy ? "Connecting…" : connected ? "Reconnect" : "Connect"}</button></div>
          </section>

          {message && <div className={`flash ${message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("invalid") ? "error" : "success"}`}>{message}</div>}

          <div className="workflow-form-grid">
            <section className="flow-card" id="programmes"><div className="flow-number">02</div><div className="flow-card-head"><div><p className="eyebrow dark">PROGRAMME</p><h2>Create Programme</h2></div><span className="record-count">{programmes.length} records</span></div><form onSubmit={createProgramme}><label>Code<input value={programme.code} onChange={(e) => setProgramme({ ...programme, code: e.target.value })} required /></label><label>Name<input value={programme.name} onChange={(e) => setProgramme({ ...programme, name: e.target.value })} required /></label><label>Objective<textarea value={programme.objective} onChange={(e) => setProgramme({ ...programme, objective: e.target.value })} required /></label><button className="form-button" disabled={!connected || busy}>Create programme</button></form><div className="record-list">{programmes.slice(0, 3).map((item) => <div key={String(item.id)}><strong>{String(item.code)}</strong><span>{String(item.name)}</span><button onClick={() => runAction(() => api(`/api/programmes/${item.id}`, { method: "DELETE" }), "Programme deleted.")}>Delete</button></div>)}</div></section>

            <section className="flow-card" id="projects"><div className="flow-number">03</div><div className="flow-card-head"><div><p className="eyebrow dark">PROJECT</p><h2>Create Project</h2></div><span className="record-count">{projects.length} records</span></div><form onSubmit={createProject}><label>Programme<select value={project.programmeId} onChange={(e) => setProject({ ...project, programmeId: e.target.value })} required><option value="">Select programme</option>{programmes.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label><label>Code<input value={project.code} onChange={(e) => setProject({ ...project, code: e.target.value })} required /></label><label>Name<input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} required /></label><label>Objective<textarea value={project.objective} onChange={(e) => setProject({ ...project, objective: e.target.value })} required /></label><button className="form-button" disabled={!connected || busy}>Create project</button></form><div className="record-list">{projects.slice(0, 3).map((item) => <div key={String(item.id)}><strong>{String(item.code)}</strong><span>{String(item.name)}</span><button onClick={() => runAction(() => api(`/api/projects/${item.id}`, { method: "DELETE" }), "Project deleted.")}>Delete</button></div>)}</div></section>

            <section className="flow-card" id="activities"><div className="flow-number">04</div><div className="flow-card-head"><div><p className="eyebrow dark">ACTIVITY</p><h2>Create Activity</h2></div><span className="record-count">{activities.length} records</span></div><form onSubmit={createActivity}><label>Project<select value={activity.projectId} onChange={(e) => setActivity({ ...activity, projectId: e.target.value })} required><option value="">Select project</option>{projects.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label><label>Title<input value={activity.title} onChange={(e) => setActivity({ ...activity, title: e.target.value })} required /></label><label>Description<textarea value={activity.description} onChange={(e) => setActivity({ ...activity, description: e.target.value })} /></label><label>Due date<input type="date" value={activity.dueDate} onChange={(e) => setActivity({ ...activity, dueDate: e.target.value })} /></label><button className="form-button" disabled={!connected || busy}>Create activity</button></form><div className="record-list">{activities.slice(0, 3).map((item) => <div key={String(item.id)}><strong>{String(item.approvalStatus)}</strong><span>{String(item.title)}</span><button onClick={() => runAction(() => api(`/api/activities/${item.id}`, { method: "DELETE" }), "Activity deleted.")}>Delete</button></div>)}</div></section>

            <section className="flow-card approval-card"><div className="flow-number gold">05</div><div className="flow-card-head"><div><p className="eyebrow dark">APPROVAL</p><h2>Submit · Approve · Reject</h2></div></div><label>Activity<select value={actionActivity} onChange={(e) => setSelectedActivity(e.target.value)}><option value="">Select activity</option>{activities.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.title)}</option>)}</select></label><div className="approval-status">{activities.find((item) => String(item.id) === actionActivity)?.approvalStatus ? <><span className="status-dot" />{String(activities.find((item) => String(item.id) === actionActivity)?.approvalStatus)}</> : "Choose an activity"}</div><div className="action-row"><button disabled={!connected || !actionActivity || busy} onClick={() => runAction(() => api(`/api/activities/${actionActivity}/submit`, { method: "POST" }), "Activity submitted.")}>Submit</button><button disabled={!connected || !actionActivity || busy} onClick={() => runAction(() => api(`/api/activities/${actionActivity}/approve`, { method: "POST" }), "Activity approved.")}>Approve</button><button className="reject" disabled={!connected || !actionActivity || busy} onClick={() => runAction(() => api(`/api/activities/${actionActivity}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectionReason }) }), "Activity rejected.")}>Reject</button></div><label>Rejection reason<input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} /></label></section>

            <section className="flow-card report-card" id="reports"><div className="flow-number">06</div><div className="flow-card-head"><div><p className="eyebrow dark">REPORT</p><h2>Create & Read Report</h2></div><span className="record-count">{reports.length} records</span></div><form onSubmit={createReport}><label>Project<select value={report.projectId} onChange={(e) => setReport({ ...report, projectId: e.target.value })} required><option value="">Select project</option>{projects.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.code)} · {String(item.name)}</option>)}</select></label><div className="date-grid"><label>Period start<input type="date" value={report.periodStart} onChange={(e) => setReport({ ...report, periodStart: e.target.value })} required /></label><label>Period end<input type="date" value={report.periodEnd} onChange={(e) => setReport({ ...report, periodEnd: e.target.value })} required /></label></div><label>Narrative<textarea value={report.narrative} onChange={(e) => setReport({ ...report, narrative: e.target.value })} required /></label><button className="form-button" disabled={!connected || busy}>Create report</button></form><div className="record-list">{reports.slice(0, 3).map((item) => <div key={String(item.id)}><strong>{String(item.periodStart)} → {String(item.periodEnd)}</strong><span>{String(item.narrative).slice(0, 70)}…</span><button onClick={() => runAction(() => api(`/api/reports/${item.id}`, { method: "DELETE" }), "Report deleted.")}>Delete</button></div>)}</div></section>
          </div>
        </div>
      </section>
    </main>
  );
}
