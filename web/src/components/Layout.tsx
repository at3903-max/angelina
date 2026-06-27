import type { ReactNode } from "react";

interface LayoutProps {
  view: "new" | "run";
  onNavigate: (view: "new" | "run", runId?: string) => void;
  runs: Array<{ id: string; config: { url: string }; status: string; createdAt: string }>;
  activeRunId?: string;
  children: ReactNode;
}

export function Layout({ view, onNavigate, runs, activeRunId, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">🤖</div>
          <div>
            <h1>Angelina</h1>
            <p>AI App Tester</p>
          </div>
        </div>

        <button
          className={`nav-btn ${view === "new" ? "active" : ""}`}
          onClick={() => onNavigate("new")}
        >
          + New Test Run
        </button>

        <div className="run-list">
          {runs.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No runs yet</p>
          )}
          {runs.map((run) => (
            <button
              key={run.id}
              className={`run-item ${activeRunId === run.id ? "active" : ""}`}
              onClick={() => onNavigate("run", run.id)}
            >
              <div className="run-item-title">{run.config.url.replace(/^https?:\/\//, "")}</div>
              <div className="run-item-meta">
                <span className={`badge badge-${run.status}`}>{run.status}</span>
                {" · "}
                {new Date(run.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
