/**
 * DEV-ONLY — replaces window.fetch for `/api/*` with canned responses, and
 * stubs EventSource. Installed only by the fixture entry (./main.tsx). No
 * request leaves the browser for any /api path while this is installed.
 */
import * as fx from './data';
import { scenario } from './scenario';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const notFound = (what: string) => json({ error: `${what} not found` }, 404);

function route(method: string, path: string, query: URLSearchParams): Response {
  const empty = scenario === 'empty';
  let m: RegExpMatchArray | null;

  if (path === '/projects') {
    if (method === 'POST') return json({ project: { ...fx.projects[0], id: 'fx-project-new' } });
    return json({ projects: empty ? [] : fx.projects });
  }
  if ((m = path.match(/^\/projects\/([^/]+)$/))) {
    if (method === 'DELETE') return json({ success: true });
    const project = fx.projects.find(p => p.id === m![1]);
    return project ? json({ project }) : notFound('Project');
  }
  if (path === '/workflows') {
    const id = query.get('projectId') ?? '';
    // `__FX_NO_AUDITS__` (set by the screenshot script) models "has projects, never ran an audit".
    const noAudits = empty || (window as unknown as { __FX_NO_AUDITS__?: boolean }).__FX_NO_AUDITS__;
    return json({ sessions: noAudits ? [] : fx.workflowsByProject[id] ?? [] });
  }
  if (path === '/reports') return json({ reports: empty ? [] : fx.reports });

  if ((m = path.match(/^\/agent\/workflow\/([^/]+)\/(status|thoughts|actions)$/))) {
    const [, id, kind] = m;
    const session = fx.monitorSessions[id];
    if (!session) return notFound('Active session');
    if (kind === 'status') return json(session);
    const live = id === fx.SESSION_RUNNING;
    if (kind === 'thoughts') return json(live ? fx.monitorThoughts : { thoughts: [] });
    return json(live ? fx.monitorActions : { actions: [] });
  }

  if ((m = path.match(/^\/reports\/([^/]+)(?:\/(executive|export|timeline))?$/))) {
    if (empty) return notFound('Report');
    if (m[2] === 'executive') return json(fx.executiveSummary);
    if (m[2] === 'export') return json(fx.exportBundle);
    if (m[2] === 'timeline') return json(fx.reportTimeline);
    return json(fx.reportPayload);
  }
  if (path.startsWith('/ux/recommendations/')) return json(fx.recommendations);
  if (path.startsWith('/ux/analyze/')) return json({ findings: fx.reportPayload.uxFindings, cognitiveSignals: fx.reportPayload.cognitiveSignals });
  if (path.startsWith('/ux/findings/')) return json({ finding: fx.reportPayload.uxFindings[0] });

  if ((m = path.match(/^\/console\/([^/]+)\/([a-z-]+)$/))) {
    const section = fx.consoleData[m[2] as keyof typeof fx.consoleData];
    return section && !empty ? json(section) : json({ error: 'Orchestration session not found' }, 404);
  }

  if (path === '/runtime/telemetry') return json(empty ? fx.runtimeTelemetryEmpty : fx.runtimeTelemetry);
  if (path.startsWith('/runtime/telemetry/')) return json(fx.sessionRuntime);

  // Anything the harness doesn't model: behave like a missing resource so the
  // page's own not-found handling is what gets rendered.
  return notFound('Fixture');
}

export function installMockApi() {
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, init);

    const method = (init?.method ?? 'GET').toUpperCase();
    if (scenario === 'loading') return new Promise<Response>(() => { /* never settles */ });
    if (scenario === 'offline') throw new TypeError('Failed to fetch');
    if (scenario === 'error') {
      return json({ error: "PrismaClientInitializationError: Can't reach database server at `db:5432`" }, 500);
    }
    await new Promise(r => setTimeout(r, 60));
    return route(method, url.pathname.slice('/api'.length), url.searchParams);
  };

  // The Investigation Console opens SSE streams; give it an inert one.
  class InertEventSource {
    readyState = 0;
    onerror: ((e: unknown) => void) | null = null;
    onmessage: ((e: unknown) => void) | null = null;
    onopen: ((e: unknown) => void) | null = null;
    addEventListener() { /* no events in fixtures */ }
    removeEventListener() { /* no-op */ }
    close() { this.readyState = 2; }
  }
  (window as unknown as { EventSource: unknown }).EventSource = InertEventSource;
}
