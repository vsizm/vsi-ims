import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { activities, activityStatus, programmes, projects, reports } from "@/db/schema";
import { database } from "@/lib/db";

export const dynamic = "force-dynamic";

const navItems = [
  ["Dashboard", "⌂", "/dashboard"],
  ["V1 Workflow", "✓", "/dashboard/workflow"],
  ["Programmes", "▣", "/dashboard/workflow#programmes"],
  ["Projects", "◫", "/dashboard/workflow#projects"],
  ["Activities", "✓", "/dashboard/workflow#activities"],
  ["Reports", "▤", "/dashboard/workflow#reports"],
];

const workflow = [
  ["01", "Authenticate", "Connect"],
  ["02", "Programme", "Create"],
  ["03", "Project", "Create"],
  ["04", "Activity", "Create"],
  ["05", "Approval", "Submit / decide"],
  ["06", "Report", "Create / read"],
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>;
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function Dashboard() {
  const db = database();

  const [programmeCount, activeProgrammeCount, projectCount, activeProjectCount, activityCount, reportCount, recentActivities] = await Promise.all([
    db.select({ value: count() }).from(programmes),
    db.select({ value: count() }).from(programmes).where(eq(programmes.active, true)),
    db.select({ value: count() }).from(projects),
    db.select({ value: count() }).from(projects).where(eq(projects.status, "ACTIVE")),
    db.select({ value: count() }).from(activities),
    db.select({ value: count() }).from(reports),
    db.select({
      id: activities.id,
      title: activities.title,
      status: activities.status,
      dueDate: activities.dueDate,
      programmeCode: programmes.code,
    })
      .from(activities)
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .leftJoin(programmes, eq(projects.programmeId, programmes.id))
      .orderBy(desc(activities.createdAt))
      .limit(5),
  ]);

  const programmesTotal = Number(programmeCount[0]?.value ?? 0);
  const activeProgrammes = Number(activeProgrammeCount[0]?.value ?? 0);
  const projectsTotal = Number(projectCount[0]?.value ?? 0);
  const activeProjects = Number(activeProjectCount[0]?.value ?? 0);
  const activitiesTotal = Number(activityCount[0]?.value ?? 0);
  const reportsTotal = Number(reportCount[0]?.value ?? 0);
  const inProgress = recentActivities.filter((item) => item.status === "IN_PROGRESS").length;
  const planned = recentActivities.filter((item) => item.status === "PLANNED").length;
  const activityHealth = activitiesTotal === 0 ? 0 : Math.round(((inProgress + planned) / activitiesTotal) * 100);

  return (
    <main className="ims-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark">VSI</div><div><strong>VSI IMS</strong><span>Information Management</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">{navItems.map(([label, icon, href], index) => <Link key={label} className={`sidebar-link ${index === 0 ? "active" : ""}`} href={href}><Icon>{icon}</Icon><span>{label}</span>{index === 0 && <b>LIVE</b>}</Link>)}</nav>
        <div className="sidebar-divider" /><div className="workspace-label">SYSTEM</div>
        <div className="sidebar-link muted-link"><Icon>◉</Icon><span>Health</span><b className="online-dot">●</b></div>
        <div className="sidebar-link muted-link"><Icon>⚙</Icon><span>Configuration</span></div>
        <div className="sidebar-bottom"><div className="user-card"><div className="avatar">PA</div><div><strong>Programme Admin</strong><span>VSI Foundation</span></div><span className="user-menu">⋮</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Dashboard</strong></div><div className="top-actions"><span className="env-pill"><span /> Development</span><button className="icon-button" aria-label="Notifications">♢</button><div className="top-avatar">PA</div></div></header>
        <div className="page-content">
          <div className="title-bar"><div><p className="eyebrow">VSI FOUNDATION · IMS V1</p><h1>Programme Operations Dashboard</h1><p>One governed view of programmes, projects, activities and reports.</p></div><div className="title-actions"><span className="db-status"><span /> Database connected</span><Link className="primary-button" href="/dashboard/workflow">Launch V1 workflow →</Link></div></div>

          <section className="stats-grid" aria-label="Key metrics">
            <article className="metric-card metric-navy"><div className="metric-top"><span>PROGRAMMES</span><span className="metric-icon">▣</span></div><strong>{activeProgrammes}</strong><p>Active programme{activeProgrammes === 1 ? "" : "s"}</p><small>{programmesTotal} programme record{programmesTotal === 1 ? "" : "s"} in the system</small></article>
            <article className="metric-card metric-blue"><div className="metric-top"><span>PROJECTS</span><span className="metric-icon">◫</span></div><strong>{activeProjects}</strong><p>Active project{activeProjects === 1 ? "" : "s"}</p><small>{projectsTotal} project record{projectsTotal === 1 ? "" : "s"} linked to programmes</small></article>
            <article className="metric-card metric-gold"><div className="metric-top"><span>ACTIVITIES</span><span className="metric-icon">✓</span></div><strong>{activitiesTotal}</strong><p>Tracked activit{activitiesTotal === 1 ? "y" : "ies"}</p><small>{inProgress} in progress · {planned} planned in the latest records</small></article>
            <article className="metric-card metric-light"><div className="metric-top"><span>REPORTS</span><span className="metric-icon">▤</span></div><strong>{reportsTotal}</strong><p>Reports submitted</p><small>Live count from the authoritative reports table</small></article>
          </section>

          <section className="workflow-panel" id="workflow"><div className="section-heading"><div><p className="eyebrow dark">THE FIRST VERTICAL SLICE</p><h2>V1 governed workflow</h2></div><Link className="section-note" href="/dashboard/workflow">Open workflow workspace →</Link></div><div className="workflow-track">{workflow.map(([number, title, status], index) => <div className="workflow-step" key={title}><div className={`step-number step-${index}`}>{number}</div><div><strong>{title}</strong><span>{status}</span></div>{index < workflow.length - 1 && <i className="step-arrow">→</i>}</div>)}</div></section>

          <div className="dashboard-grid">
            <section className="panel activity-panel" id="activities"><div className="panel-heading"><div><p className="eyebrow dark">OPERATIONS</p><h2>Recent activities</h2></div><Link href="/dashboard/workflow#activities">Manage →</Link></div><div className="activity-table">{recentActivities.length === 0 ? <div className="more">No activities have been created yet. Start the V1 workflow to create the first one.</div> : recentActivities.map((activity) => { const tone = activity.status === "IN_PROGRESS" ? "blue" : activity.status === "COMPLETE" ? "navy" : "gold"; return <article className="activity-row" key={activity.id}><div className={`activity-mark ${tone}`}>{activity.title.slice(0, 1)}</div><div className="activity-main"><strong>{activity.title}</strong><span>{activity.programmeCode ?? "Unlinked programme"}</span></div><span className={`status ${tone}`}>{activity.status.replaceAll("_", " ")}</span><time>{formatDate(activity.dueDate)}</time></article>; })}</div></section>
            <section className="panel progress-panel" id="projects"><div className="panel-heading"><div><p className="eyebrow dark">PROJECT HEALTH</p><h2>Delivery progress</h2></div><span className="more">LIVE</span></div><div className="progress-visual"><div className="donut" style={{ background: `conic-gradient(var(--school-bus-yellow) 0 ${activityHealth}%, #e9eef2 ${activityHealth}% 100%)` }}><div><strong>{activityHealth}%</strong><span>activity health</span></div></div><div className="progress-copy"><strong>Current V1 delivery</strong><span>{activeProjects} active project{activeProjects === 1 ? "" : "s"} · {activitiesTotal} activit{activitiesTotal === 1 ? "y" : "ies"}</span><div className="bar"><i style={{ width: `${activityHealth}%` }} /></div><small>Health reflects the latest activity records available in the system.</small></div></div><div className="mini-metrics"><div><strong>{projectsTotal}</strong><span>Projects</span></div><div><strong>{activitiesTotal}</strong><span>Activities</span></div><div><strong>{reportsTotal}</strong><span>Reports</span></div></div></section>
          </div>

          <div className="dashboard-grid lower-grid">
            <section className="panel notice-panel" id="reports"><div className="panel-heading"><div><p className="eyebrow dark">ATTENTION BOARD</p><h2>Next actions</h2></div><span className="count-badge">{inProgress + planned}</span></div><div className="notice-list"><div><span className="notice-dot gold-dot" /><p><strong>Activity pipeline</strong><small>{planned} planned activit{planned === 1 ? "y" : "ies"} in the latest records.</small></p><b>Live</b></div><div><span className="notice-dot blue-dot" /><p><strong>Approval queue</strong><small>Use the workflow workspace to submit or decide activities.</small></p><b>Open</b></div><div><span className="notice-dot navy-dot" /><p><strong>Reporting</strong><small>{reportsTotal} report{reportsTotal === 1 ? "" : "s"} currently stored in the system.</small></p><b>Live</b></div></div></section>
            <section className="panel quick-panel"><div className="panel-heading"><div><p className="eyebrow dark">QUICK ACCESS</p><h2>Core actions</h2></div></div><div className="quick-grid"><Link href="/dashboard/workflow#programmes"><span>＋</span><strong>New programme</strong><small>Start a governed record</small></Link><Link href="/dashboard/workflow#projects"><span>＋</span><strong>New project</strong><small>Link to a programme</small></Link><Link href="/dashboard/workflow#activities"><span>＋</span><strong>New activity</strong><small>Track delivery</small></Link><Link href="/dashboard/workflow#reports"><span>＋</span><strong>New report</strong><small>Capture narrative</small></Link></div></section>
          </div>
          <footer className="dashboard-footer"><span>VSI IMS · Foundation V1</span><span>Authoritative data workspace</span><span>© Visionary Students Initiative</span></footer>
        </div>
      </section>
    </main>
  );
}
