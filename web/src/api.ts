import type { RunProgressEvent, StartRunRequest, TestRunSummary } from "./types";

const API = "/api";

export async function fetchRuns(): Promise<TestRunSummary[]> {
  const res = await fetch(`${API}/runs`);
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function fetchRun(id: string): Promise<TestRunSummary> {
  const res = await fetch(`${API}/runs/${id}`);
  if (!res.ok) throw new Error("Run not found");
  return res.json();
}

export async function startRun(body: StartRunRequest): Promise<TestRunSummary> {
  const res = await fetch(`${API}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to start run");
  return data;
}

export function subscribeToRun(
  id: string,
  onEvent: (event: RunProgressEvent | { type: "snapshot"; run: TestRunSummary }) => void
): () => void {
  const source = new EventSource(`${API}/runs/${id}/events`);

  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };

  return () => source.close();
}

export function screenshotUrl(runId: string, filename: string): string {
  return `${API}/runs/${runId}/screenshots/${filename.split("/").pop()}`;
}
