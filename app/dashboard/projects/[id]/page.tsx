"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  programmeId: string;
  programmeCode?: string;
  programmeName?: string;
  code: string;
  name: string;
  objective: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/projects/${params.id}`);

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Project not found."
              : "Unable to load project."
          );
        }

        setProject(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load project.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  if (loading) {
    return (
      <main className="page-content">
        <section className="panel">
          <p className="section-note">Loading project…</p>
        </section>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="page-content">
        <section className="panel">
          <p style={{ color: "#b42318", margin: 0 }}>
            {error || "Project not found."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-content">
      <div className="breadcrumb" style={{ marginBottom: 14 }}>
        <Link href="/dashboard/programmes">Programmes</Link>
        <i>/</i>
        <Link href={`/dashboard/programmes/${project.programmeId}`}>
          {project.programmeCode || "Programme"}
        </Link>
        <i>/</i>
        <strong>{project.code}</strong>
      </div>

      <section className="title-bar">
        <div>
          <p className="eyebrow">{project.code}</p>
          <h1>{project.name}</h1>
          <p>{project.objective}</p>
        </div>

        <div className="title-actions">
          <div className="db-status">
            <span />
            Live database
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="metric-card metric-navy">
          <div className="metric-top">
            <span>PROJECT</span>
            <span className="metric-icon">J</span>
          </div>
          <strong>{project.code}</strong>
          <p>Project code</p>
          <small>Authoritative project record.</small>
        </article>

        <article className="metric-card metric-blue">
          <div className="metric-top">
            <span>PROGRAMME</span>
            <span className="metric-icon">P</span>
          </div>
          <strong>{project.programmeCode || "—"}</strong>
          <p>Parent programme</p>
          <small>{project.programmeName || "Programme relationship"}</small>
        </article>

        <article className="metric-card metric-gold">
          <div className="metric-top">
            <span>STATUS</span>
            <span className="metric-icon">●</span>
          </div>
          <strong>{project.status}</strong>
          <p>Project status</p>
          <small>Current implementation lifecycle state.</small>
        </article>

        <article className="metric-card metric-light">
          <div className="metric-top">
            <span>NEXT LAYER</span>
            <span className="metric-icon">→</span>
          </div>
          <strong>Activities</strong>
          <p>Implementation</p>
          <small>Activities will sit beneath this project.</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow dark">Project Definition</p>
              <h2>Objective</h2>
            </div>
          </div>

          <p
            style={{
              margin: "18px 0 0",
              color: "var(--ink)",
              fontSize: ".8rem",
              lineHeight: 1.75
            }}
          >
            {project.objective}
          </p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow dark">IMS Architecture</p>
              <h2>Delivery layers</h2>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {[
              ["Programme", project.programmeCode || "Parent programme"],
              ["Project", project.code],
              ["Activities", "Implementation records"],
              ["Indicators", "Performance measures"],
              ["Results", "Actual performance"],
              ["Reports", "Reporting and accountability"]
            ].map(([label, value], index) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 11px",
                  borderRadius: 8,
                  background: index < 2 ? "#eaf0f5" : "var(--pale)"
                }}
              >
                <strong
                  style={{
                    color: "var(--regal-navy)",
                    fontSize: ".64rem"
                  }}
                >
                  {label}
                </strong>
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: ".59rem",
                    textAlign: "right"
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
