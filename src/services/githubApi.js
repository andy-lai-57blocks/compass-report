const API_BASE = 'http://localhost:3001';

/**
 * Load the report from the static JSON file in public/.
 * In development: Vite serves public/ as static assets.
 * In production (Vercel): report.json is copied alongside the build.
 */
export async function getReport() {
  const res = await fetch('/report.json');
  if (!res.ok) throw new Error(`Failed to load report: ${res.status}`);
  return res.json();
}

/**
 * Trigger a full re-analysis on the server.
 */
export async function triggerReanalysis() {
  const res = await fetch(`${API_BASE}/api/analyze`, { method: 'POST' });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

/**
 * Get current analysis status
 */
export async function getStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
}

/**
 * Subscribe to SSE progress updates
 */
export function subscribeProgress(onStatus) {
  const eventSource = new EventSource(`${API_BASE}/api/analyze/progress`);
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onStatus(data);
      if (!data.running) {
        setTimeout(() => eventSource.close(), 2000);
      }
    } catch {}
  };
  eventSource.onerror = () => {};
  return () => eventSource.close();
}

