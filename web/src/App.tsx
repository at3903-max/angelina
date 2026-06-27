import { useCallback, useEffect, useState } from "react";
import { fetchRuns, startRun } from "./api";
import { Layout } from "./components/Layout";
import { NewRunForm } from "./components/NewRunForm";
import { RunDetail } from "./components/RunDetail";
import type { StartRunRequest, TestRunSummary } from "./types";

type View = "new" | "run";

export default function App() {
  const [view, setView] = useState<View>("new");
  const [runs, setRuns] = useState<TestRunSummary[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refreshRuns = useCallback(async () => {
    try {
      const list = await fetchRuns();
      setRuns(list);
    } catch {
      /* server may not be up yet */
    }
  }, []);

  useEffect(() => {
    refreshRuns();
    const interval = setInterval(refreshRuns, 5000);
    return () => clearInterval(interval);
  }, [refreshRuns]);

  const navigate = (v: View, runId?: string) => {
    setView(v);
    if (runId) setActiveRunId(runId);
    setError(undefined);
  };

  const handleStart = async (req: StartRunRequest) => {
    setLoading(true);
    setError(undefined);
    try {
      const run = await startRun(req);
      await refreshRuns();
      setActiveRunId(run.id);
      setView("run");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      view={view}
      onNavigate={navigate}
      runs={runs}
      activeRunId={activeRunId}
    >
      {view === "new" && (
        <NewRunForm onSubmit={handleStart} loading={loading} error={error} />
      )}
      {view === "run" && activeRunId && <RunDetail runId={activeRunId} />}
      {view === "run" && !activeRunId && (
        <div className="empty-state">Select a run from the sidebar or start a new test.</div>
      )}
    </Layout>
  );
}
