"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Row = Record<string, any>;
type FormState = Record<string, any>;

const empty: FormState = {
  beneficiary: { beneficiaryCode: "", fullName: "", dateOfBirth: "", ageGroup: "YOUTH", sex: "NOT_STATED", pwd: false, provinceId: "", districtId: "", deliverySiteId: "" },
  intervention: { projectId: "", activityId: "", districtId: "", deliverySiteId: "", interventionDate: "", title: "", status: "PLANNED", notes: "" },
  participant: { interventionId: "", beneficiaryId: "" },
  indicator: { projectId: "", activityId: "", code: "", name: "", description: "", level: "OUTPUT", unit: "COUNT" },
  target: { indicatorId: "", year: String(new Date().getFullYear()), targetValue: "", provinceId: "", districtId: "", notes: "" },
  result: { targetId: "", periodStart: "", periodEnd: "", actualValue: "", notes: "" },
};

export default function DataPage() {
  const [data, setData] = useState<Record<string, Row[]>>({ projects: [], activities: [], beneficiaries: [], interventions: [], participants: [], indicators: [], targets: [], results: [], provinces: [], districts: [], sites: [] });
  const [form, setForm] = useState<FormState>(empty);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  }

  async function refresh() {
    const entries = await Promise.all([
      ["projects", "/api/projects"], ["activities", "/api/activities"], ["beneficiaries", "/api/beneficiaries"],
      ["interventions", "/api/interventions"], ["participants", "/api/intervention-participants"], ["indicators", "/api/indicators"],
      ["targets", "/api/targets"], ["results", "/api/results"], ["provinces", "/api/provinces"],
    ].map(async ([key, path]) => [key, await api(path)] as const));
    setData(Object.fromEntries(entries));
  }

  useEffect(() => { refresh().catch(error => setMessage(error instanceof Error ? error.message : "Unable to load operational data.")); }, []);

  function setField(section: string, field: string, value: unknown) {
    setForm((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  }

  async function loadDistricts(provinceId: string, section: string) {
    if (!provinceId) { setData((current) => ({ ...current, districts: [], sites: [] })); return; }
    const districts = await api(`/api/districts?provinceId=${encodeURIComponent(provinceId)}`);
    setData((current) => ({ ...current, districts }));
    setField(section, "districtId", "");
    if (section === "beneficiary") setField(section, "deliverySiteId", "");
  }

  async function loadSites(districtId: string) {
    if (!districtId) { setData((current) => ({ ...current, sites: [] })); return; }
    const sites = await api(`/api/delivery-sites?districtId=${encodeURIComponent(districtId)}`);
    setData((current) => ({ ...current, sites }));
  }

  async function submit(event: FormEvent, path: string, section: string, success: string) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api(path, { method: "POST", body: JSON.stringify(form[section]) }); await refresh(); setForm((current) => ({ ...current, [section]: empty[section] })); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(false); }
  }

  const select = (section: string, field: string, items: Row[], label: (item: Row) => string, required = false) => <select required={required} value={form[section][field]} onChange={e => setField(section, field, e.target.value)}><option value="">Select</option>{items.map(item => <option key={String(item.id)} value={String(item.id)}>{label(item)}</option>)}</select>;
  const css = `.page{max-width:1500px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{background:#fff;border:1px solid var(--line);border-radius:13px;padding:20px;box-shadow:var(--shadow)}h2{margin:0 0 12px;color:var(--regal-navy);font-size:1rem}.eyebrow{color:var(--muted);font-size:.58rem;font-weight:900;letter-spacing:.08em;margin:0 0 5px}.form{display:grid;gap:9px}.form label{display:grid;gap:4px;color:var(--regal-navy);font-size:.62rem;font-weight:800}.form input,.form select,.form textarea{width:100%;border:1px solid #cddbe5;background:#fbfdfe;border-radius:7px;padding:8px;color:var(--ink);font:inherit;font-size:.68rem}.form textarea{min-height:58px}.btn{border:0;border-radius:7px;padding:10px;background:var(--regal-navy);color:#fff;font-size:.65rem;font-weight:900;cursor:pointer}.btn:disabled{opacity:.5}.flash{margin:0 0 18px;padding:11px;border-radius:8px;background:#edf8f2;color:#16744d;font-size:.65rem;font-weight:800}@media(max-width:900px){.grid{grid-template-columns:1fr}}`;

  return <main className="ims-shell"><style>{css}</style><aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div><div className="workspace-label">WORKSPACE</div><nav className="sidebar-nav"><Link className="sidebar-link" href="/dashboard">Dashboard</Link><Link className="sidebar-link" href="/dashboard/workflow">V1 Workflow</Link><Link className="sidebar-link active" href="/dashboard/data">Operational Data <b>V1</b></Link></nav></aside><section className="workspace"><header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Operational Data</strong></div><div className="top-actions"><span className="env-pill"><span /> Authenticated</span><div className="top-avatar">VSI</div></div></header><div className="page-content page"><div className="title-bar"><div><p className="eyebrow">VSI FOUNDATION · V1 DELIVERY</p><h1>Operational data capture</h1><p>Beneficiary → Intervention → Participant → Indicator → Target → Result.</p></div><Link className="primary-button" href="/dashboard/workflow">← Workflow</Link></div>{message && <div className="flash">{message}</div>}<div className="grid">

<section className="card"><p className="eyebrow">07 · BENEFICIARY</p><h2>Register beneficiary</h2><form className="form" onSubmit={e=>submit(e,"/api/beneficiaries","beneficiary","Beneficiary registered.")}><label>Code<input required value={form.beneficiary.beneficiaryCode} onChange={e=>setField("beneficiary","beneficiaryCode",e.target.value)}/></label><label>Full name<input required value={form.beneficiary.fullName} onChange={e=>setField("beneficiary","fullName",e.target.value)}/></label><label>Age group<select value={form.beneficiary.ageGroup} onChange={e=>setField("beneficiary","ageGroup",e.target.value)}><option>CHILD</option><option>YOUTH</option><option>ADULT</option></select></label><label>Sex<select value={form.beneficiary.sex} onChange={e=>setField("beneficiary","sex",e.target.value)}><option>NOT_STATED</option><option>FEMALE</option><option>MALE</option></select></label><label>Province{select("beneficiary","provinceId",data.provinces,x=>String(x.name))}</label><label>District{select("beneficiary","districtId",data.districts,x=>String(x.name))}</label><label>Delivery site{select("beneficiary","deliverySiteId",data.sites,x=>String(x.name))}</label><label><span><input type="checkbox" checked={form.beneficiary.pwd} onChange={e=>setField("beneficiary","pwd",e.target.checked)}/> PWD</span></label><button className="btn" disabled={busy}>Register beneficiary</button></form></section>

<section className="card"><p className="eyebrow">08 · INTERVENTION</p><h2>Record intervention</h2><form className="form" onSubmit={e=>submit(e,"/api/interventions","intervention","Intervention recorded.")}><label>Project{select("intervention","projectId",data.projects,x=>`${x.code} · ${x.name}`,true)}</label><label>Activity{select("intervention","activityId",data.activities,x=>String(x.title))}</label><label>District{select("intervention","districtId",data.districts,x=>String(x.name),true)}</label><label>Delivery site{select("intervention","deliverySiteId",data.sites,x=>String(x.name))}</label><label>Date<input required type="date" value={form.intervention.interventionDate} onChange={e=>setField("intervention","interventionDate",e.target.value)}/></label><label>Title<input required value={form.intervention.title} onChange={e=>setField("intervention","title",e.target.value)}/></label><label>Status<select value={form.intervention.status} onChange={e=>setField("intervention","status",e.target.value)}><option>PLANNED</option><option>IN_PROGRESS</option><option>COMPLETE</option><option>CANCELLED</option></select></label><button className="btn" disabled={busy}>Record intervention</button></form></section>

<section className="card"><p className="eyebrow">09 · PARTICIPANT</p><h2>Link participant</h2><form className="form" onSubmit={e=>submit(e,"/api/intervention-participants","participant","Participant linked.")}><label>Intervention{select("participant","interventionId",data.interventions,x=>String(x.title),true)}</label><label>Beneficiary{select("participant","beneficiaryId",data.beneficiaries,x=>`${x.beneficiaryCode} · ${x.fullName}`,true)}</label><button className="btn" disabled={busy}>Link participant</button></form></section>

<section className="card"><p className="eyebrow">10 · INDICATOR</p><h2>Define indicator</h2><form className="form" onSubmit={e=>submit(e,"/api/indicators","indicator","Indicator defined.")}><label>Project{select("indicator","projectId",data.projects,x=>`${x.code} · ${x.name}`,true)}</label><label>Activity{select("indicator","activityId",data.activities,x=>String(x.title))}</label><label>Code<input required value={form.indicator.code} onChange={e=>setField("indicator","code",e.target.value)}/></label><label>Name<input required value={form.indicator.name} onChange={e=>setField("indicator","name",e.target.value)}/></label><label>Level<select value={form.indicator.level} onChange={e=>setField("indicator","level",e.target.value)}><option>OUTPUT</option><option>OUTCOME</option></select></label><label>Unit<select value={form.indicator.unit} onChange={e=>setField("indicator","unit",e.target.value)}><option>COUNT</option><option>PERCENTAGE</option><option>RATE</option><option>OTHER</option></select></label><button className="btn" disabled={busy}>Define indicator</button></form></section>

<section className="card"><p className="eyebrow">11 · TARGET</p><h2>Set target</h2><form className="form" onSubmit={e=>submit(e,"/api/targets","target","Target saved.")}><label>Indicator{select("target","indicatorId",data.indicators,x=>`${x.code} · ${x.name}`,true)}</label><label>Year<input required type="number" value={form.target.year} onChange={e=>setField("target","year",e.target.value)}/></label><label>Target value<input required type="number" step="any" value={form.target.targetValue} onChange={e=>setField("target","targetValue",e.target.value)}/></label><label>Province{select("target","provinceId",data.provinces,x=>String(x.name))}</label><label>District{select("target","districtId",data.districts,x=>String(x.name))}</label><button className="btn" disabled={busy}>Save target</button></form></section>

<section className="card"><p className="eyebrow">12 · RESULT</p><h2>Capture result</h2><form className="form" onSubmit={e=>submit(e,"/api/results","result","Result captured.")}><label>Target{select("result","targetId",data.targets,x=>`Target ${x.year} · ${x.targetValue}`,true)}</label><label>Period start<input required type="date" value={form.result.periodStart} onChange={e=>setField("result","periodStart",e.target.value)}/></label><label>Period end<input required type="date" value={form.result.periodEnd} onChange={e=>setField("result","periodEnd",e.target.value)}/></label><label>Actual value<input required type="number" step="any" value={form.result.actualValue} onChange={e=>setField("result","actualValue",e.target.value)}/></label><button className="btn" disabled={busy}>Capture result</button></form></section>

</div></div></section></main>;
}
