import type { TestReport } from "../types";

interface ReportViewProps {
  report: TestReport;
}

export function ReportView({ report }: ReportViewProps) {
  const { understanding } = report;

  return (
    <div className="card">
      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>App understanding</h3>
      <p style={{ margin: "0 0 1rem", color: "var(--text-muted)" }}>{understanding.purpose}</p>

      <div style={{ marginBottom: "1rem" }}>
        <strong style={{ fontSize: "0.85rem" }}>Target user:</strong>
        <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
          {understanding.targetUser}
        </span>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong style={{ fontSize: "0.85rem" }}>
          Pages explored: {understanding.discoveredPages.length}
        </strong>
      </div>

      <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
        Features found ({understanding.coreFeatures.length})
      </h4>
      <ul className="feature-list">
        {understanding.coreFeatures.map((f) => (
          <li key={f.id}>
            <strong>{f.name}</strong>
            <span
              className={`badge badge-${f.priority === "critical" ? "failed" : "discovering"}`}
              style={{ marginLeft: "0.5rem" }}
            >
              {f.priority}
            </span>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {f.description}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
