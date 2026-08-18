"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Programme = { id: string; code: string; name: string; objective: string; active: boolean };
type Project = { id: string; programmeId: string; code: string; name: string; status: string };

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", objective: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function load() {
    const [p, pr] = await Promise.all([api("/api/programmes"), api("/api/projects")]);
    setProgrammes(p); setProjects(pr);
  }

  useEffect(() => { load().catch((e) => setMessage(e instanceof Error ? e.message : "Unable to load programmes.")); }, []);

  const visible = useMemo(() => programmes.filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase())), [programmes, search]);
  const projectCount = (programmeId: string) => projects.filter((p) => p.programmeId === programmeId).length;

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api("/api/programmes", { method: "POST", body: JSON.stringify(form) }); setForm({ code: "", name: "", objective: "" }); setShowCreate(false); await load(); setMessage("Programme created successfully."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to create programme."); }
    finally { setBusy(false); }
  }

  return <main className="ims-shell"><aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div><div className="workspace-label">WORKSPACE</div><nav className="sidebar-nav"><Link className="sidebar-link" href="/dashboard"><span className="nav-icon">⌂</span><span>Dashboard</span></Link><Link className="sidebar-link active" href="/dashboard/programmes"><span className="nav-icon">▣</span><span>Programmes</span></Link><Link className="sidebar-link" href="/dashboard/activities"><span className="nav-icon">✓</span><span>Activities</span></Link><Link className="sidebar-link" href="/dashboard/finance"><span className="nav-icon">₭</span><span>Financial Intelligence</span></Link><Link className="sidebar-link" href="/dashboard/volunteers"><span className="nav-icon">♙</span><span>Volunteer Management</span></Link></nav></aside><section className="workspace"><header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Programmes</strong></div><div className="top-actions"><span className="env-pill"><span/> Connected</span><div className="top-avatar">PA</div></div></header><div className="page-content"><style>{`.management{max-width:1500px}.management .toolbar{display:flex;gap:10px;align-items:center;margin:18px 0}.management input,.management textarea{border:1px solid var(--line);border-radius:8px;padding:10px 12px;background:#fff;font:inherit;color:var(--ink)}.management .search{flex:1;max-width:420px}.management .action{border:0;border-radius:8px;padding:10px 14px;background:var(--regal-navy);color:#fff;font:inherit;font-weight:800;cursor:pointer}.management .action.secondary{background:#e9f0f5;color:var(--regal-navy)}.management .flash{padding:10px 12px;border-radius:8px;background:#edf8f2;color:#16744d;font-size:.82rem;font-weight:700}.management .list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.management .record{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;box-shadow:var(--shadow)}.management .record-top{display:flex;justify-content:space-between;gap:12px}.management .code{font-size:.72rem;font-weight:900;color:var(--baltic-blue);letter-spacing:.08em}.management .record h2{margin:7px 0 6px;color:var(--regal-navy);font-size:1.08rem}.management .record p{margin:0;color:var(--muted);font-size:.82rem;line-height:1.55}.management .meta{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.management .pill{padding:5px 8px;border-radius:99px;background:#eef4f8;color:var(--regal-navy);font-size:.7rem;font-weight:800}.management .create{margin-top:14px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px}.management form{display:grid;gap:10px;max-width:760px}.management label{display:grid;gap:5px;color:var(--regal-navy);font-size:.76rem;font-weight:800}.management textarea{min-height:90px}.management .empty{padding:28px;background:#fff;border:1px dashed #cbd8e1;border-radius:12px;color:var(--muted);text-align:center}@media(max-width:900px){.management .list{grid-template-columns:1fr}.management .toolbar{flex-wrap:wrap}.management .search{max-width:none;width:100%}}`}</style><div className="management"><div className="title-bar"><div><p className="eyebrow">PROGRAMME MANAGEMENT</p><h1>Programmes</h1><p>Manage the organisation's programme portfolio and its linked projects.</p></div><button className="primary-button" onClick={() => setShowCreate((v) => !v)}>{showCreate ? "Close" : "+ New programme"}</button></div>{message && <div className="flash" style={{marginTop:18}}>{message}</div>}<div className="toolbar"><input className="search" placeholder="Search programmes…" value={search} onChange={(e) => setSearch(e.target.value)} /><span className="more">{visible.length} programme records</span></div>{showCreate && <section className="create"><h2 style={{marginTop:0,color:"var(--regal-navy)"}}>New programme</h2><form onSubmit={create}><label>Programme code<input required value={form.code} onChange={(e) => setForm({...form,code:e.target.value})} /></label><label>Programme name<input required value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} /></label><label>Objective<textarea required value={form.objective} onChange={(e) => setForm({...form,objective:e.target.value})} /></label><div><button className="action" disabled={busy}>{busy ? "Saving…" : "Create programme"}</button></div></form></section>}<section className="list" style={{marginTop:18}}>{visible.length===0 ? <div className="empty">No programmes match your search.</div> : visible.map((p) => <article className="record" key={p.id}><div className="record-top"><span className="code">{p.code}</span><span className="pill">{p.active ? "ACTIVE" : "INACTIVE"}</span></div><h2>{p.name}</h2><p>{p.objective}</p><div className="meta"><span className="pill">{projectCount(p.id)} linked {projectCount(p.id) === 1 ? "project" : "projects"}</span><Link className="action secondary" href={`/dashboard/projects?programme=${encodeURIComponent(p.id)}`}>View projects</Link></div></article>)}</section></div></div></section></main>;
}
