import Link from "next/link";

const navItems = [
  ["Dashboard", "⌂", "/dashboard"],
  ["Programmes", "▣", "/dashboard#programmes"],
  ["Projects", "◫", "/dashboard#projects"],
  ["Activities", "✓", "/dashboard#activities"],
  ["Reports", "▤", "/dashboard#reports"],
];

const activities = [
  { title: "School outreach planning", programme: "EYE-01", status: "IN PROGRESS", date: "18 Aug 2026", tone: "blue" },
  { title: "Volunteer orientation", programme: "EYE-01", status: "PLANNED", date: "22 Aug 2026", tone: "gold" },
  { title: "Quarterly activity report", programme: "EYE-01", status: "PLANNED", date: "30 Sep 2026", tone: "navy" },
];

const workflow = [
  ["01", "Programme", "Defined"],
  ["02", "Project", "Active"],
  ["03", "Activity", "In progress"],
  ["04", "Approval", "Next action"],
  ["05", "Report", "Ready"],
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="nav-icon" aria-hidden="true">{children}</span>;
}

export default function Dashboard() {
  return (
    <main className="ims-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">VSI</div>
          <div><strong>VSI IMS</strong><span>Information Management</span></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(([label, icon, href], index) => (
            <Link key={label} className={`sidebar-link ${index === 0 ? "active" : ""}`} href={href}>
              <Icon>{icon}</Icon><span>{label}</span>{index === 0 && <b>LIVE</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">SYSTEM</div>
        <div className="sidebar-link muted-link"><Icon>◉</Icon><span>Health</span><b className="online-dot">●</b></div>
        <div className="sidebar-link muted-link"><Icon>⚙</Icon><span>Configuration</span></div>
        <div className="sidebar-bottom">
          <div className="user-card"><div className="avatar">PA</div><div><strong>Programme Admin</strong><span>VSI Foundation</span></div><span className="user-menu">⋮</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>VSI IMS</span><i>/</i><strong>Dashboard</strong></div>
          <div className="top-actions"><span className="env-pill"><span /> Development</span><button className="icon-button" aria-label="Notifications">♢</button><div className="top-avatar">PA</div></div>
        </header>

        <div className="page-content">
          <div className="title-bar">
            <div><p className="eyebrow">VSI FOUNDATION · IMS V1</p><h1>Programme Operations Dashboard</h1><p>One governed view of programmes, projects, activities and reports.</p></div>
            <div className="title-actions"><span className="db-status"><span /> Database connected</span><Link className="primary-button" href="#workflow">View workflow →</Link></div>
          </div>

          <section className="stats-grid" aria-label="Key metrics">
            <article className="metric-card metric-navy"><div className="metric-top"><span>PROGRAMMES</span><span className="metric-icon">▣</span></div><strong>1</strong><p>Active programme</p><small>EYE-01 · Education & Youth Empowerment</small></article>
            <article className="metric-card metric-blue"><div className="metric-top"><span>PROJECTS</span><span className="metric-icon">◫</span></div><strong>1</strong><p>Active project</p><small>Project records linked to programmes</small></article>
            <article className="metric-card metric-gold"><div className="metric-top"><span>ACTIVITIES</span><span className="metric-icon">✓</span></div><strong>3</strong><p>Tracked activities</p><small>1 in progress · 2 planned</small></article>
            <article className="metric-card metric-light"><div className="metric-top"><span>REPORTS</span><span className="metric-icon">▤</span></div><strong>0</strong><p>Reports submitted</p><small>Next reporting cycle · Q3 2026</small></article>
          </section>

          <section className="workflow-panel" id="workflow">
            <div className="section-heading"><div><p className="eyebrow dark">THE FIRST VERTICAL SLICE</p><h2>Governed workflow</h2></div><span className="section-note">Programme → project → activity → approval → report</span></div>
            <div className="workflow-track">
              {workflow.map(([number, title, status], index) => (
                <div className="workflow-step" key={title}><div className={`step-number step-${index}`}>{number}</div><div><strong>{title}</strong><span>{status}</span></div>{index < workflow.length - 1 && <i className="step-arrow">→</i>}</div>
              ))}
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="panel activity-panel" id="activities">
              <div className="panel-heading"><div><p className="eyebrow dark">OPERATIONS</p><h2>Recent activities</h2></div><Link href="#activities">View all →</Link></div>
              <div className="activity-table">
                {activities.map((activity) => <article className="activity-row" key={activity.title}><div className={`activity-mark ${activity.tone}`}>{activity.title.slice(0, 1)}</div><div className="activity-main"><strong>{activity.title}</strong><span>{activity.programme}</span></div><span className={`status ${activity.tone}`}>{activity.status}</span><time>{activity.date}</time></article>)}
              </div>
            </section>

            <section className="panel progress-panel" id="projects">
              <div className="panel-heading"><div><p className="eyebrow dark">PROJECT HEALTH</p><h2>Delivery progress</h2></div><span className="more">2026</span></div>
              <div className="progress-visual"><div className="donut"><div><strong>67%</strong><span>on track</span></div></div><div className="progress-copy"><strong>Education & Youth Empowerment</strong><span>Project EYE-01</span><div className="bar"><i /></div><small>2 of 3 activity milestones planned or underway</small></div></div>
              <div className="mini-metrics"><div><strong>1</strong><span>Project</span></div><div><strong>3</strong><span>Activities</span></div><div><strong>0</strong><span>Reports</span></div></div>
            </section>
          </div>

          <div className="dashboard-grid lower-grid">
            <section className="panel notice-panel" id="reports">
              <div className="panel-heading"><div><p className="eyebrow dark">ATTENTION BOARD</p><h2>Next actions</h2></div><span className="count-badge">3</span></div>
              <div className="notice-list">
                <div><span className="notice-dot gold-dot" /><p><strong>Submit activity</strong><small>School outreach planning is ready for submission.</small></p><b>Today</b></div>
                <div><span className="notice-dot blue-dot" /><p><strong>Approval queue</strong><small>No activities currently awaiting approval.</small></p><b>Clear</b></div>
                <div><span className="notice-dot navy-dot" /><p><strong>Quarterly report</strong><small>Reporting window closes 30 September 2026.</small></p><b>45d</b></div>
              </div>
            </section>

            <section className="panel quick-panel">
              <div className="panel-heading"><div><p className="eyebrow dark">QUICK ACCESS</p><h2>Core actions</h2></div></div>
              <div className="quick-grid"><Link href="#programmes"><span>＋</span><strong>New programme</strong><small>Start a governed record</small></Link><Link href="#projects"><span>＋</span><strong>New project</strong><small>Link to a programme</small></Link><Link href="#activities"><span>＋</span><strong>New activity</strong><small>Track delivery</small></Link><Link href="#reports"><span>＋</span><strong>New report</strong><small>Capture narrative</small></Link></div>
            </section>
          </div>
          <footer className="dashboard-footer"><span>VSI IMS · Foundation V1</span><span>Authoritative data workspace</span><span>© Visionary Students Initiative</span></footer>
        </div>
      </section>
    </main>
  );
}
