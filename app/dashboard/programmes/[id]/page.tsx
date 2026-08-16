"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  programmeId: string;
  code: string;
  name: string;
  objective: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

type Programme = {
  id: string;
  code: string;
  name: string;
  objective: string;
  active: boolean;
  projects: Project[];
};

export default function ProgrammeDetailPage() {
  const params = useParams<{ id: string }>();
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/programmes/${params.id}`);

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Programme not found."
              : "Unable to load programme."
          );
        }

        setProgramme(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load programme.");
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
          <p className="section-note">Loading programme…</p>
        </section>
      </main>
    );
  }

  if (error || !programme) {
    return (
      <main className="page-content">
        <section className="panel">
          <p style={{ color: "#b42318", margin: 0 }}>
            {error || "Programme not found."}
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
        <strong>{programme.code}</strong>
      </div>

      <section className="title-bar">
        <div>
          <p className="eyebrow">{programme.code}</p>
          <h1>{programme.name}</h1>
          <p>{programme.objective}</p>
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
            <span>PROGRAMME</span>
            <span className="metric-icon">P</span>
          </div>
          <strong>{programme.code}</strong>
          <p>Programme code</p>
          <small>Authoritative programme record.</small>
        </article>

        <article className="metric-card metric-blue">
          <div className="metric-top">
            <span>PROJECTS</span>
            <span className="metric-icon">J</span>
          </div>
          <strong>{programme.projects.length}</strong>
          <p>Projects</p>
          <small>Projects directly linked to this programme.</small>
        </article>

        <article className="metric-card metric-gold">
          <div className="metric-top">
            <span>STATUS</span>
            <span className="metric-icon">✓</span>
          </div>
          <strong>{programme.active ? "ON" : "OFF"}</strong>
          <p>Programme active</p>
          <small>Current programme lifecycle state.</small>
        </article>

        <article className="metric-card metric-light">
          <div className="metric-top">
            <span>NEXT LEVEL</span>
            <span className="metric-icon">↳</span>
          </div>
          <strong>Project</strong>
          <p>Delivery layer</p>
          <small>Projects translate this programme into implementation.</small>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow dark">Delivery Structure</p>
            <h2>Projects under {programme.code}</h2>
          </div>
          <Link href="/dashboard/programmes" className="more">
            ← All programmes
          </Link>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {programme.projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "100px minmax(0, 1fr) auto",
                gap: 16,
                alignItems: "center",
                padding: "18px",
                border: "1px solid var(--line)",
                borderRadius: 11
              }}
            >
              <div>
                <strong
                  style={{
                    display: "inline-block",
                    padding: "7px 9px",
                    borderRadius: 7,
                    background: "#e8eef3",
                    color: "var(--regal-navy)",
                    fontSize: ".62rem"
                  }}
                >
                  {project.code}
                </strong>
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    color: "var(--regal-navy)",
                    fontSize: ".82rem"
                  }}
                >
                  {project.name}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "var(--muted)",
                    fontSize: ".62rem",
                    lineHeight: 1.5
                  }}
                >
                  {project.objective}
                </span>
              </div>

              <div style={{ textAlign: "right" }}>
                <span className="status blue">{project.status}</span>
                <span
                  style={{
                    display: "block",
                    marginTop: 7,
                    color: "var(--yale-blue)",
                    fontSize: ".57rem",
                    fontWeight: 900
                  }}
                >
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
