"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Programme = {
  id: string;
  code: string;
  name: string;
  objective: string;
  active: boolean;
};

type Project = {
  id: string;
  programmeId: string;
  code: string;
  name: string;
  objective: string;
  status: string;
};

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [programmeResponse, projectResponse] = await Promise.all([
          fetch("/api/programmes"),
          fetch("/api/projects")
        ]);

        if (!programmeResponse.ok) {
          throw new Error("Unable to load programmes.");
        }

        if (!projectResponse.ok) {
          throw new Error("Unable to load projects.");
        }

        const programmeData = await programmeResponse.json();
        const projectData = await projectResponse.json();

        setProgrammes(programmeData);
        setProjects(projectData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main className="page-content">
      <section className="title-bar">
        <div>
          <p className="eyebrow">Programme Management</p>
          <h1>Programmes</h1>
          <p>
            The authoritative VSI programme structure and the projects delivered
            under each programme.
          </p>
        </div>

        <div className="title-actions">
          <div className="db-status">
            <span />
            Live database
          </div>
        </div>
      </section>

      {loading && (
        <section className="panel" style={{ marginTop: 18 }}>
          <p className="section-note">Loading programmes from the database…</p>
        </section>
      )}

      {error && (
        <section className="panel" style={{ marginTop: 18 }}>
          <p style={{ color: "#b42318", margin: 0 }}>{error}</p>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="stats-grid">
            <article className="metric-card metric-navy">
              <div className="metric-top">
                <span>PROGRAMMES</span>
                <span className="metric-icon">P</span>
              </div>
              <strong>{programmes.length}</strong>
              <p>Active programme structure</p>
              <small>Authoritative records currently held in the IMS.</small>
            </article>

            <article className="metric-card metric-blue">
              <div className="metric-top">
                <span>PROJECTS</span>
                <span className="metric-icon">J</span>
              </div>
              <strong>{projects.length}</strong>
              <p>Projects across programmes</p>
              <small>Projects are linked to their parent programme.</small>
            </article>

            <article className="metric-card metric-gold">
              <div className="metric-top">
                <span>ACTIVE</span>
                <span className="metric-icon">✓</span>
              </div>
              <strong>{programmes.filter((p) => p.active).length}</strong>
              <p>Active programmes</p>
              <small>Programme records currently marked active.</small>
            </article>

            <article className="metric-card metric-light">
              <div className="metric-top">
                <span>HIERARCHY</span>
                <span className="metric-icon">↳</span>
              </div>
              <strong>2</strong>
              <p>Core levels</p>
              <small>Programme → Project, ready for activities and results.</small>
            </article>
          </section>

          <section className="panel" style={{ marginTop: 18 }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow dark">VSI Operating Model</p>
                <h2>Programme structure</h2>
              </div>
              <span className="more">{programmes.length} programmes</span>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {programmes.map((programme) => {
                const programmeProjects = projects.filter(
                  (project) => project.programmeId === programme.id
                );

                return (
                  <Link
                    key={programme.id}
                    href={`/dashboard/programmes/${programme.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "76px minmax(0, 1fr) auto",
                      gap: 16,
                      alignItems: "center",
                      padding: "17px 18px",
                      border: "1px solid var(--line)",
                      borderRadius: 11,
                      background: "#fff",
                      transition: "0.18s ease"
                    }}
                  >
                    <div
                      style={{
                        width: 62,
                        height: 42,
                        borderRadius: 9,
                        background: "var(--regal-navy)",
                        color: "var(--gold)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: ".72rem",
                        fontWeight: 900
                      }}
                    >
                      {programme.code}
                    </div>

                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: "var(--regal-navy)",
                          fontSize: ".82rem"
                        }}
                      >
                        {programme.name}
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
                        {programme.objective}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong
                        style={{
                          display: "block",
                          color: "var(--regal-navy)",
                          fontSize: "1.15rem"
                        }}
                      >
                        {programmeProjects.length}
                      </strong>
                      <span
                        style={{
                          color: "var(--muted)",
                          fontSize: ".56rem"
                        }}
                      >
                        {programmeProjects.length === 1 ? "PROJECT" : "PROJECTS"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
