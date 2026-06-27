import { useEffect, useState } from "react";
import { fetchRun, subscribeToRun, screenshotUrl } from "../api";
import type { RunPhase, RunProgressEvent, TestRunSummary } from "../types";
import { ReportView } from "./ReportView";

const PHASES: RunPhase[] = ["discovering", "planning", "executing", "reporting", "completed"];

interface RunDetailProps {
  runId: string;
}

export function RunDetail({ runId }: RunDetailProps) {
  const [run, setRun] = useState<TestRunSummary | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<RunPhase>("queued");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchRun(runId).then((r) => {
      if (!cancelled) {
        setRun(r);
        setLogs(r.logs);
        setPhase(r.status);
      }
    });

    const unsubscribe = subscribeToRun(runId, (event) => {
      if (event.type === "snapshot" && "run" in event) {
        setRun(event.run);
        setLogs(event.run.logs);
        setPhase(event.run.status);
        return;
      }

      const e = event as RunProgressEvent;
      if (e.phase) setPhase(e.phase);
      if (e.message) setLogs((prev) => [...prev, `[${e.timestamp}] ${e.message}`]);

      if (e.type === "complete" || e.type === "report") {
        fetchRun(runId).then((r) => {
          if (!cancelled) setRun(r);
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [runId]);

  if (!run) {
    return <div className="empty-state">Loading run...</div>;
  }

  const isRunning = !["completed", "failed"].includes(run.status);

  return (
    <div>
      <div className="page-header">
        <h2>{run.config.appName || run.config.url.replace(/^https?:\/\//, "")}</h2>
        <p>{run.config.url}</p>
      </div>

      {run.error && <div className="error-banner">{run.error}</div>}

      <div className="phase-track">
        {PHASES.map((p) => {
          const idx = PHASES.indexOf(p);
          const currentIdx = PHASES.indexOf(phase as RunPhase);
          const cls =
            phase === p
              ? "active"
              : currentIdx > idx || phase === "completed"
                ? "done"
                : "";
          return (
            <span key={p} className={`phase-step ${cls}`}>
              {p}
            </span>
          );
        })}
      </div>

      {run.report && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-num">{run.report.summary.total}</div>
            <div className="stat-label">Tests</div>
          </div>
          <div className="stat-card stat-pass">
            <div className="stat-num">{run.report.summary.passed}</div>
            <div className="stat-label">Passed</div>
          </div>
          <div className="stat-card stat-fail">
            <div className="stat-num">{run.report.summary.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{Math.round(run.report.summary.durationMs / 1000)}s</div>
            <div className="stat-label">Duration</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>
          {isRunning ? "Live activity" : "Activity log"}
        </h3>
        <div className="log-panel">
          {logs.length === 0 && <div className="log-line">Waiting for activity...</div>}
          {logs.map((line, i) => (
            <div key={i} className="log-line">
              {line}
            </div>
          ))}
        </div>
      </div>

      {run.report && (
        <>
          <ReportView report={run.report} />

          <div className="card" style={{ marginTop: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Test results</h3>
            <div className="test-results">
              {run.report.results.map((result) => (
                <div
                  key={result.testCase.id}
                  className={`test-card ${result.status === "passed" ? "pass" : "fail"}`}
                >
                  <div
                    className="test-card-header"
                    onClick={() =>
                      setExpandedTest(
                        expandedTest === result.testCase.id ? null : result.testCase.id
                      )
                    }
                  >
                    <span className={`badge badge-${result.status === "passed" ? "completed" : "failed"}`}>
                      {result.status}
                    </span>
                    <strong>{result.testCase.name}</strong>
                    <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {result.durationMs}ms
                    </span>
                  </div>
                  {expandedTest === result.testCase.id && (
                    <div className="test-card-body">
                      <p style={{ margin: "0 0 0.75rem", color: "var(--text-muted)" }}>
                        {result.testCase.description}
                      </p>
                      {result.error && (
                        <p style={{ color: "var(--fail)", margin: "0 0 0.75rem" }}>{result.error}</p>
                      )}
                      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
                        {result.stepResults.map((step) => (
                          <li key={step.stepIndex} style={{ marginBottom: "0.5rem" }}>
                            {step.action.description}
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              {step.message}
                            </div>
                            {step.screenshotPath && (
                              <img
                                src={screenshotUrl(runId, step.screenshotPath)}
                                alt={`Step ${step.stepIndex + 1}`}
                                style={{
                                  maxWidth: "100%",
                                  marginTop: "0.5rem",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border)",
                                }}
                              />
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
