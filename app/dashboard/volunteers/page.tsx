import Link from "next/link";

const cardStyle = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "74px minmax(0, 760px)",
  gap: 22,
  alignItems: "start",
  padding: 28,
  background: "#fff",
  border: "1px solid var(--line)",
  borderTop: "4px solid var(--regal-navy)",
  borderRadius: 16,
  boxShadow: "0 12px 30px rgba(0,53,102,.08)",
};

const iconStyle = {
  width: 60,
  height: 60,
  borderRadius: 16,
  background: "#e8f0f6",
  color: "var(--regal-navy)",
  display: "grid",
  placeItems: "center",
  fontSize: "1.35rem",
  fontWeight: 900,
};

export default function VolunteersPage() {
  return (
    <main className="ims-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">VSI</div>
          <div>
            <strong>VSI IMS</strong>
            <span>Information Management</span>
          </div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          <Link className="sidebar-link" href="/dashboard">⌂ <span>Dashboard</span></Link>
          <Link className="sidebar-link" href="/dashboard/directorates">▤ <span>Directorates</span></Link>
          <Link className="sidebar-link" href="/dashboard/programmes">▣ <span>Programmes</span></Link>
          <Link className="sidebar-link" href="/dashboard/projects">◫ <span>Projects</span></Link>
          <Link className="sidebar-link" href="/dashboard/activities">✓ <span>Activities</span></Link>
          <Link className="sidebar-link" href="/dashboard/finance">₭ <span>Financial Intelligence</span></Link>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>VSI IMS</span><i>/</i><strong>Volunteer Management</strong>
          </div>
          <div className="top-actions">
            <span className="env-pill"><span /> Connected</span>
            <div className="top-avatar">PA</div>
          </div>
        </header>

        <div className="page-content">
          <section className="title-bar">
            <div>
              <p className="eyebrow">MODULE STATUS</p>
              <h1>Volunteer Management</h1>
              <p>This module is temporarily frozen while VSI IMS is focused on the core delivery hierarchy.</p>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={iconStyle}>⏸</div>
            <div>
              <span style={{ fontSize: ".61rem", fontWeight: 950, letterSpacing: ".12em", color: "var(--baltic-blue)" }}>
                TEMPORARILY FROZEN
              </span>
              <h2 style={{ margin: "5px 0 8px", color: "var(--regal-navy)", fontSize: "1.35rem" }}>
                Volunteer Management is on hold
              </h2>
              <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: ".82rem", lineHeight: 1.65 }}>
                The existing volunteer data and API layer are retained for integrity and future reactivation, but the management interface is intentionally inactive in the current V1 operating surface.
              </p>
              <div style={{ display: "grid", gap: 7, margin: "0 0 20px", color: "var(--regal-navy)", fontSize: ".72rem", fontWeight: 750 }}>
                <span>✓ Programmes remain active</span>
                <span>✓ CPRM remains active</span>
                <span>✓ MEAL, Finance/Admin, PAR, Legal and Operations remain enabling functions</span>
              </div>
              <Link className="primary-button" href="/dashboard">
                Return to Programme Operations →
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
