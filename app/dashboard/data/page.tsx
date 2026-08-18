"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Row = Record<string, any>;

type DataState = {
  projects: Row[];
  activities: Row[];
  beneficiaries: Row[];
  interventions: Row[];
  participants: Row[];
  provinces: Row[];
  districts: Row[];
  sites: Row[];
};

const initial: DataState = { projects: [], activities: [], beneficiaries: [], interventions: [], participants: [], provinces: [], districts: [], sites: [] };

export default function DataPage() {
  const [data, setData] = useState<DataState>(initial);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [beneficiary, setBeneficiary] = useState({ beneficiaryCode: "", fullName: "", ageGroup: "YOUTH", sex: "NOT_STATED", pwd: false, provinceId: "", districtId: "", deliverySiteId: "" });
  const [intervention, setIntervention] = useState({ projectId: "", activityId: "", districtId: "", deliverySiteId: "", interventionDate: "", title: "", status: "PLANNED", notes: "" });
  const [participant, setParticipant] = useState({ interventionId: "", beneficiaryId: "" });

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }

  async function refresh() {
    const requests = [
      ["projects", "/api/projects"], ["activities", "/api/activities"], ["beneficiaries", "/api/beneficiaries"],
      ["interventions", "/api/interventions"], ["participants", "/api/intervention-participants"], ["provinces", "/api/provinces"],
    ] as const;
    const entries = await Promise.all(requests.map(async ([key, path]) => [key, await api(path)] as const));
    setData(current => ({ ...current, ...Object.fromEntries(entries) }));
  }

  useEffect(() => { refresh().catch(error => setMessage(error instanceof Error ? error.message : "Unable to load operational data.")); }, []);

  async function loadDistricts(provinceId: string) {
    setBeneficiary(current => ({ ...current, provinceId, districtId: "", deliverySiteId: "" }));
    setIntervention(current => ({ ...current, districtId: "", deliverySiteId: "" }));
    if (!provinceId) { setData(current => ({ ...current, districts: [], sites: [] })); return; }
    try {
      const districts = await api(`/api/districts?provinceId=${encodeURIComponent(provinceId)}`);
      setData(current => ({ ...current, districts, sites: [] }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load districts."); }
  }

  async function loadSites(districtId: string) {
    setBeneficiary(current => ({ ...current, districtId, deliverySiteId: "" }));
    setIntervention(current => ({ ...current, districtId, deliverySiteId: "" }));
    if (!districtId) { setData(current => ({ ...current, sites: [] })); return; }
    try {
      const sites = await api(`/api/delivery-sites?districtId=${encodeURIComponent(districtId)}`);
      setData(current => ({ ...current, sites }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load delivery sites."); }
  }

  async function submit(event: FormEvent, path: string, body: unknown, success: string, reset: () => void) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api(path, { method: "POST", body: JSON.stringify(body) }); await refresh(); reset(); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => data.beneficiaries.filter(x => `${x.beneficiaryCode} ${x.fullName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 10), [data.beneficiaries, search]);
  const select = (value: string, items: Row[], label: (item: Row) => string, onChange: (value: string) => void, required = false) => <select required={required} value={value} onChange={event => onChange(event.target.value)}><option value="">Select</option>{items.map(item => <option key={String(item.id)} value={String(item.id)}>{label(item)}</option>)}</select>;

  return <main className="ims-shell"><style>{`.data-page{max-width:1500px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.panel{background:#fff;border:1px solid var(--line);border-radius:13px;padding:20px;box-shadow:var(--shadow)}.form{display:grid;gap:10px}.form label{display:grid;gap:4px;font-size:.65rem;font-weight:800;color:var(--regal-navy)}.form input,.form select{width:100%;border:1px solid #cddbe5;border-radius:7px;padding:9px;background:#fbfdfe;font:inherit;font-size:.68rem}.btn{border:0;border-radius:7px;padding:10px;background:var(--regal-navy);color:#fff;font-size:.65rem;font-weight:900;cursor:pointer}.btn:disabled{opacity:.5}.flash{margin-bottom:16px;padding:11px;border-radius:8px;background:#edf8f2;color:#16744d;font-size:.65rem;font-weight:800}.toolbar{display:flex;gap:10px;margin:18px 0;align-items:center}.search{flex:1;max-width:500px;border:1px solid var(--line);border-radius:8px;padding:10px;background:#fff}.records{display:grid;gap:8px}.record{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:9px}.mark{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;background:#eaf2f8;color:var(--regal-navy);font-weight:900}.record-main{display:grid;gap:2px}.record-main strong{font-size:.72rem;color:var(--regal-navy)}.record-main span{font-size:.61rem;color:var(--muted)}.tag{font-size:.57rem;font-weight:900;padding:5px 8px;border-radius:99px;background:#eef4f8;color:var(--regal-navy)}@media(max-width:900px){.grid{grid-template-columns:1fr}.toolbar{flex-wrap:wrap}.search{max-width:none;width:100%}}`}</style><aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div><div className="workspace-label">WORKSPACE</div><nav className="sidebar-nav"><Link className="sidebar-link" href="/dashboard">Dashboard</Link><Link className="sidebar-link" href="/dashboard/workflow">V1 Workflow</Link><Link className="sidebar-link active" href="/dashboard/data">Operational Data</Link></nav></aside><section className="workspace"><header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Operational Data</strong></div><div className="top-actions"><span className="env-pill"><span/> Authenticated</span><div className="top-avatar">VSI</div></div></header><div className="page-content data-page"><div className="title-bar"><div><p className="eyebrow">VSI FOUNDATION · V1 DELIVERY</p><h1>Operational Data</h1><p>Capture beneficiary reach and field delivery records against the authoritative programme structure.</p></div><Link className="primary-button" href="/dashboard/workflow">← Workflow</Link></div>{message && <div className="flash">{message}</div>}<section className="stats-grid"><article className="metric-card metric-navy"><div className="metric-top"><span>BENEFICIARIES</span><span className="metric-icon">♙</span></div><strong>{data.beneficiaries.length}</strong><p>Registered</p><small>Authoritative people register</small></article><article className="metric-card metric-blue"><div className="metric-top"><span>PARTICIPATION</span><span className="metric-icon">↗</span></div><strong>{data.participants.length}</strong><p>Participation links</p><small>Beneficiary-to-intervention links</small></article><article className="metric-card metric-gold"><div className="metric-top"><span>INTERVENTIONS</span><span className="metric-icon">✓</span></div><strong>{data.interventions.length}</strong><p>Recorded</p><small>{data.interventions.filter(x => x.status === "COMPLETE").length} completed</small></article><article className="metric-card metric-light"><div className="metric-top"><span>PROJECTS</span><span className="metric-icon">◫</span></div><strong>{data.projects.length}</strong><p>Available</p><small>{data.activities.length} activities available</small></article></section><div className="toolbar"><input className="search" placeholder="Search beneficiary register…" value={search} onChange={event => setSearch(event.target.value)}/><span className="more">{data.beneficiaries.length} beneficiary records</span></div><div className="grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">BENEFICIARY REGISTER</p><h2>Recent beneficiaries</h2></div><span className="more">{filtered.length} shown</span></div><div className="records">{filtered.length === 0 ? <div className="more">No matching beneficiary records.</div> : filtered.map(item => <article className="record" key={item.id}><div className="mark">{String(item.fullName || "?").slice(0,1)}</div><div className="record-main"><strong>{item.fullName}</strong><span>{item.beneficiaryCode} · {item.ageGroup || "—"} · {item.sex || "—"}</span></div><span className="tag">{item.pwd ? "PWD" : "REGISTERED"}</span></article>)}</div></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">DELIVERY PIPELINE</p><h2>Current records</h2></div></div><div className="records"><article className="record"><div className="mark">P</div><div className="record-main"><strong>Projects</strong><span>Authoritative project portfolio</span></div><span className="tag">{data.projects.length}</span></article><article className="record"><div className="mark">A</div><div className="record-main"><strong>Activities</strong><span>Delivery activities linked to projects</span></div><span className="tag">{data.activities.length}</span></article><article className="record"><div className="mark">I</div><div className="record-main"><strong>Interventions</strong><span>Field delivery records</span></div><span className="tag">{data.interventions.length}</span></article><article className="record"><div className="mark">R</div><div className="record-main"><strong>Participation</strong><span>Beneficiary participation links</span></div><span className="tag">{data.participants.length}</span></article></div></section></div><div className="grid" style={{marginTop:18}}><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">BENEFICIARY CAPTURE</p><h2>Register beneficiary</h2></div></div><form className="form" onSubmit={event => submit(event,"/api/beneficiaries",beneficiary,"Beneficiary registered.",() => setBeneficiary({beneficiaryCode:"",fullName:"",ageGroup:"YOUTH",sex:"NOT_STATED",pwd:false,provinceId:"",districtId:"",deliverySiteId:""}))}><label>Beneficiary code<input required value={beneficiary.beneficiaryCode} onChange={event => setBeneficiary(current => ({...current,beneficiaryCode:event.target.value}))}/></label><label>Full name<input required value={beneficiary.fullName} onChange={event => setBeneficiary(current => ({...current,fullName:event.target.value}))}/></label><label>Age group<select value={beneficiary.ageGroup} onChange={event => setBeneficiary(current => ({...current,ageGroup:event.target.value}))}><option>CHILD</option><option>YOUTH</option><option>ADULT</option></select></label><label>Sex<select value={beneficiary.sex} onChange={event => setBeneficiary(current => ({...current,sex:event.target.value}))}><option>NOT_STATED</option><option>FEMALE</option><option>MALE</option></select></label><label>Province{select(beneficiary.provinceId,data.provinces,x=>String(x.name),loadDistricts)}</label><label>District{select(beneficiary.districtId,data.districts,x=>String(x.name),loadSites)}</label><label>Delivery site{select(beneficiary.deliverySiteId,data.sites,x=>String(x.name),value => setBeneficiary(current => ({...current,deliverySiteId:value})))}</label><label><span><input type="checkbox" checked={beneficiary.pwd} onChange={event => setBeneficiary(current => ({...current,pwd:event.target.checked}))}/> PWD</span></label><button className="btn" disabled={busy}>Register beneficiary</button></form></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">FIELD DELIVERY</p><h2>Record intervention</h2></div></div><form className="form" onSubmit={event => submit(event,"/api/interventions",intervention,"Intervention recorded.",() => setIntervention({projectId:"",activityId:"",districtId:"",deliverySiteId:"",interventionDate:"",title:"",status:"PLANNED",notes:""}))}><label>Project{select(intervention.projectId,data.projects,x=>`${x.code} · ${x.name}`,value => setIntervention(current => ({...current,projectId:value})),true)}</label><label>Activity{select(intervention.activityId,data.activities,x=>String(x.title),value => setIntervention(current => ({...current,activityId:value})))}</label><label>District{select(intervention.districtId,data.districts,x=>String(x.name),loadSites,true)}</label><label>Delivery site{select(intervention.deliverySiteId,data.sites,x=>String(x.name),value => setIntervention(current => ({...current,deliverySiteId:value})))}</label><label>Date<input required type="date" value={intervention.interventionDate} onChange={event => setIntervention(current => ({...current,interventionDate:event.target.value}))}/></label><label>Title<input required value={intervention.title} onChange={event => setIntervention(current => ({...current,title:event.target.value}))}/></label><label>Status<select value={intervention.status} onChange={event => setIntervention(current => ({...current,status:event.target.value}))}><option>PLANNED</option><option>IN_PROGRESS</option><option>COMPLETE</option><option>CANCELLED</option></select></label><button className="btn" disabled={busy}>Record intervention</button></form></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">PARTICIPATION</p><h2>Link beneficiary to intervention</h2></div></div><form className="form" onSubmit={event => submit(event,"/api/intervention-participants",participant,"Participant linked.",() => setParticipant({interventionId:"",beneficiaryId:""}))}><label>Intervention{select(participant.interventionId,data.interventions,x=>String(x.title),value => setParticipant(current => ({...current,interventionId:value})),true)}</label><label>Beneficiary{select(participant.beneficiaryId,data.beneficiaries,x=>`${x.beneficiaryCode} · ${x.fullName}`,value => setParticipant(current => ({...current,beneficiaryId:value})),true)}</label><button className="btn" disabled={busy}>Link participant</button></form></section></div></div></section></main>;
}
