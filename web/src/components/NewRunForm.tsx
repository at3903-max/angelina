import { useState, type FormEvent } from "react";
import type { StartRunRequest } from "../types";

interface NewRunFormProps {
  onSubmit: (req: StartRunRequest) => Promise<void>;
  loading: boolean;
  error?: string;
}

export function NewRunForm({ onSubmit, loading, error }: NewRunFormProps) {
  const [url, setUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [maxPages, setMaxPages] = useState(8);
  const [maxTests, setMaxTests] = useState(15);
  const [model, setModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({
      url,
      appName: appName || undefined,
      appDescription: appDescription || undefined,
      maxPages,
      maxTests,
      model,
      apiKey: apiKey || undefined,
    });
  };

  return (
    <div>
      <div className="page-header">
        <h2>Test any app</h2>
        <p>
          Point Angelina at a URL. She'll explore the app, understand what it does, and test every
          function like a real user.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="url">App URL *</label>
          <input
            id="url"
            type="url"
            placeholder="https://your-app.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-row-2">
          <div className="form-row">
            <label htmlFor="name">App name (optional)</label>
            <input
              id="name"
              placeholder="My App"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="model">AI model</label>
            <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="desc">What does the app do? (helps AI understand faster)</label>
          <textarea
            id="desc"
            rows={3}
            placeholder="e.g. A todo list app where users can add, complete, and delete tasks"
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
          />
        </div>

        <div className="form-row-2">
          <div className="form-row">
            <label htmlFor="pages">Max pages to explore</label>
            <input
              id="pages"
              type="number"
              min={1}
              max={20}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="tests">Max test cases</label>
            <input
              id="tests"
              type="number"
              min={1}
              max={50}
              value={maxTests}
              onChange={(e) => setMaxTests(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="key">OpenAI API key (optional if set on server)</label>
          <input
            id="key"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading || !url.trim()}>
          {loading ? "Starting..." : "Start Testing"}
        </button>
      </form>
    </div>
  );
}
