import { useState } from 'react';
import {
  Rocket, PlaySquare, FileBarChart, Film, Activity, HelpCircle,
  AlertTriangle, ScrollText, ChevronRight, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type SectionKey =
  | 'getting-started'
  | 'running-audits'
  | 'understanding-reports'
  | 'replay-guide'
  | 'runtime-observability'
  | 'faq'
  | 'known-issues'
  | 'release-notes';

const SECTIONS: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { key: 'getting-started', label: 'Getting Started', icon: Rocket },
  { key: 'running-audits', label: 'Running Audits', icon: PlaySquare },
  { key: 'understanding-reports', label: 'Understanding Reports', icon: FileBarChart },
  { key: 'replay-guide', label: 'Replay Guide', icon: Film },
  { key: 'runtime-observability', label: 'Runtime Observability', icon: Activity },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'known-issues', label: 'Known Issues', icon: AlertTriangle },
  { key: 'release-notes', label: 'Release Notes', icon: ScrollText },
];

const card = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' };
const accentCard = { background: 'rgba(115,66,226,0.05)', border: '1px solid rgba(115,66,226,0.15)' };

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex gap-4">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
      style={{ background: 'linear-gradient(135deg, #7342e2, #9b72fa)' }}
    >
      {n}
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
    </div>
  </div>
);

const FaqItem = ({ q, a }: { q: string; a: string }) => (
  <div className="rounded-xl p-5" style={card}>
    <p className="text-sm font-semibold text-white mb-2">{q}</p>
    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{a}</p>
  </div>
);

function GettingStarted() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Fricta explores your website like a real user, finds usability friction, and turns it into an
        evidence-backed report. Here's the fastest path from sign-up to your first finding.
      </p>
      <div className="rounded-2xl p-6 space-y-6" style={card}>
        <Step n={1} title="Create an account" desc="Sign up with Google or email via Clerk. Your session stays active across the dashboard, and every project you create is scoped to your account." />
        <Step n={2} title="Create your first project" desc="From the Dashboard's empty state (or the Run Audit wizard), give your project a name and a website URL. Fricta validates the URL before continuing." />
        <Step n={3} title="Launch an audit" desc="Describe an audit goal (e.g. 'complete checkout as a first-time buyer') and pick a persona. Fricta deploys an AI agent that navigates your site autonomously." />
        <Step n={4} title="Watch it work" desc="The live Workflow Monitor streams the agent's status, current step, actions, and reasoning in real time as it explores your product." />
        <Step n={5} title="Review the report" desc="When the run completes, open the generated report for a UX score, severity-ranked findings, and screenshot evidence for each issue." />
      </div>
      <div className="rounded-2xl p-5 flex items-center justify-between" style={accentCard}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Ready to try it yourself?</p>
        <Link to="/app/workflow" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'rgba(115,66,226,0.2)', border: '1px solid rgba(115,66,226,0.35)' }}>
          Run New Audit <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function RunningAudits() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        The Run Audit wizard (Dashboard → New Audit) collects everything the agent needs in two short steps.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={card}>
          <p className="text-sm font-bold text-white mb-2">Step 1 — Project</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Pick an existing project or create one on the spot with a name and website URL. The URL is
            validated and normalized (https:// is added automatically if missing).
          </p>
        </div>
        <div className="rounded-2xl p-5" style={card}>
          <p className="text-sm font-bold text-white mb-2">Step 2 — Target, Goal & Persona</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Confirm the target URL, write a goal of at least 10 characters describing what the agent should
            accomplish, and choose a persona (e.g. Tech-Savvy User, First-Time User) that shapes how it explores.
          </p>
        </div>
      </div>
      <div className="rounded-2xl p-5" style={card}>
        <p className="text-sm font-bold text-white mb-3">Writing a good audit goal</p>
        <ul className="space-y-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <li>• Be specific about the task, not the page: "Sign up for a free trial and reach the dashboard" beats "check the homepage."</li>
          <li>• Mention a persona-relevant constraint if it matters: "...as a user who has never used a UX tool before."</li>
          <li>• Advanced: use the "Advanced Options" panel to pass template variables the agent can reference mid-run.</li>
        </ul>
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        The Launch button is disabled while a run is submitting, so duplicate double-clicks won't start two audits.
      </p>
    </div>
  );
}

function UnderstandingReports() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Every completed audit produces a report under <span className="text-white font-mono text-xs">Reports</span>.
        Each report is built from the same run the agent just performed — nothing is pre-canned.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Overall UX Score & Grade', desc: 'A single composite score (with an A–F grade) summarizing session quality across all scored dimensions.' },
          { title: 'Severity Breakdown', desc: 'Findings bucketed into Critical / High / Medium / Low so you can triage what matters first.' },
          { title: 'Issues & Recommendations', desc: 'Each finding includes a title, description, evidence, and an actionable fix recommendation.' },
          { title: 'Timeline', desc: 'A chronological view correlating agent actions, thoughts, and findings across the session.' },
          { title: 'Evidence', desc: 'Screenshots and bounding-box overlays tied to the exact moment an issue was detected.' },
          { title: 'Export', desc: 'Download the report as a PDF, a Markdown executive summary, a PM summary sheet, or full developer JSON.' },
        ].map((it) => (
          <div key={it.title} className="rounded-2xl p-5" style={card}>
            <p className="text-sm font-bold text-white mb-1.5">{it.title}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{it.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReplayGuide() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Session Replay reconstructs exactly what the agent saw, frame by frame, synced to its actions and reasoning.
        Open it from a report's Evidence tab, or directly from Investigation Console.
      </p>
      <div className="rounded-2xl p-6 space-y-4" style={card}>
        {[
          ['Play / Pause', 'Step through the session automatically, or pause on any frame to inspect it.'],
          ['Previous / Next', 'Move one step at a time through the recorded frames.'],
          ['Timeline Scrubber', 'Drag to any point in the session — thoughts, actions, and findings stay in sync with the frame shown.'],
          ['Zoom & Pan', 'Hold Ctrl/Cmd and scroll to zoom into a screenshot (1×–5×); click and drag to pan around while zoomed in.'],
          ['Evidence Viewer', 'Each frame surfaces the agent\'s thought, the interaction it performed, and any finding detected at that step.'],
        ].map(([t, d]) => (
          <div key={t} className="flex items-start gap-3">
            <ChevronRight className="w-4 h-4 text-[#9b72fa] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">{t}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuntimeObservabilityGuide() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        The <Link to="/app/runtime" className="text-[#9b72fa] hover:underline">Runtime Observability</Link> page shows
        the health of the infrastructure actually running your audits — not simulated numbers.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ['Worker Cluster Health', 'Live CPU/memory usage and active job count per registered worker node.'],
          ['Queue Activity', 'Active, waiting, completed, failed, and delayed job counts per execution queue.'],
          ['Browser Pool', 'How many Playwright browser contexts are active vs. idle, plus recycling stats.'],
          ['Recovery Checkpoints', 'Per-session recovery events and lock state — open a session in Investigation Console to see its checkpoint.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl p-5" style={card}>
            <p className="text-sm font-bold text-white mb-1.5">{t}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{d}</p>
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        This is distinct from <span className="text-white">Live Telemetry</span>, which tracks real end-user
        sessions on your site (RUM) rather than Fricta's own execution infrastructure.
      </p>
    </div>
  );
}

function Faq() {
  return (
    <div className="space-y-4">
      <FaqItem q="Does Fricta need access to my source code?" a="No. Fricta drives a real browser against your live (or staging) URL like a human visitor would — no code access or SDK installation is required to run an audit." />
      <FaqItem q="How long does an audit take?" a="Most single-goal audits complete in a few minutes, depending on site complexity and how many steps the agent needs to reach the goal. You can watch progress live in the Workflow Monitor." />
      <FaqItem q="Can I run the same URL with multiple personas?" a="Yes — launch separate audits with different personas (e.g. First-Time User vs. Power User) against the same project to compare how experience quality varies by user type." />
      <FaqItem q="What happens if the agent gets stuck?" a="Runs that stall or fail are marked FAILED rather than hanging indefinitely, and any findings gathered up to that point are still preserved and reviewable." />
      <FaqItem q="Who can see my projects and reports?" a="Projects, workflow sessions, and reports are scoped to your authenticated account; API routes enforce ownership checks before returning project or report data." />
      <FaqItem q="Can I export a report to share with my team?" a="Yes — reports export as a PDF, a Markdown executive summary, a copy-paste PM summary sheet, or full developer JSON from the report detail view." />
    </div>
  );
}

function KnownIssues() {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
        We'd rather tell you about rough edges than let you find them. Here's what's actively being worked on:
      </p>
      {[
        ['Lint backlog', 'Enabling proper TypeScript linting surfaced a large backlog of style-level warnings (mostly `console` usage and `any` types) across older packages. These are non-blocking warnings, not build errors, and are being cleared incrementally.'],
        ['Mobile & small-screen layouts', 'Dashboard, Projects, Reports, Findings, Help Center, and navigation are fully responsive, and Workflow Monitor / Runtime Observability are tablet-friendly. Power-user views built around dense multi-column layouts and precise pointer interaction — Session Replay, Evidence Explorer, and the Investigation Console — show a "switch to a larger screen" message on phones and small tablets instead of a cramped experience.'],
        ['Dependency security advisories', 'A couple of dependencies (react-router, hono/node-server) have open CVEs with fixes only in major-version upgrades; we\'re validating the upgrade path before rolling it out.'],
      ].map(([t, d]) => (
        <div key={t} className="rounded-xl p-5 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">{t}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReleaseNotes() {
  const entries = [
    {
      date: 'Latest',
      title: 'Findings resolution workflow, PDF export, and project management',
      items: [
        'Findings can now be marked Under Review, Resolved, or Dismissed with investigator notes — backed by real, persisted data.',
        'Reports export as real PDFs (in addition to Markdown, PM summary, and developer JSON).',
        'Added a full Projects section: create, edit, delete, and view per-project audit history.',
        'OAuth integration tokens are now encrypted at rest.',
        'Route-level code-splitting cuts the initial bundle size significantly.',
      ],
    },
    {
      date: '2026-07-20',
      title: 'Platform hardening & Runtime Observability fix',
      items: [
        'Runtime Observability now links to the real, DB-backed worker/queue/browser-pool panel instead of a simulated telemetry view.',
        'Added backend security headers (CSP, X-Frame-Options, HSTS) and origin-scoped CORS.',
        'Fixed the ESLint configuration so TypeScript and JSX are actually linted (previously silently skipped).',
        'Added this Help Center.',
      ],
    },
    {
      date: '2026-07-09',
      title: 'Brand theme unification',
      items: [
        'Applied the primary purple theme consistently across Investigation Console, Reports, and every intelligence dashboard.',
        'Rebuilt the landing page with a cinematic video background, custom cursor, and refreshed AI Intelligence section.',
      ],
    },
    {
      date: '2026-07-08',
      title: 'Landing page assembly',
      items: [
        'Composed the full marketing landing page: hero, features, how-it-works, product demo, replay showcase, pricing/FAQ, and footer CTA.',
      ],
    },
  ];
  return (
    <div className="space-y-6">
      {entries.map((e) => (
        <div key={e.title} className="rounded-2xl p-6" style={card}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: 'rgba(115,66,226,0.12)', color: '#9b72fa' }}>
              {e.date}
            </span>
            <p className="text-sm font-bold text-white">{e.title}</p>
          </div>
          <ul className="space-y-1.5 pl-1">
            {e.items.map((it) => (
              <li key={it} className="text-xs leading-relaxed flex gap-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span className="text-[#9b72fa]">–</span>{it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const CONTENT: Record<SectionKey, React.ComponentType> = {
  'getting-started': GettingStarted,
  'running-audits': RunningAudits,
  'understanding-reports': UnderstandingReports,
  'replay-guide': ReplayGuide,
  'runtime-observability': RuntimeObservabilityGuide,
  faq: Faq,
  'known-issues': KnownIssues,
  'release-notes': ReleaseNotes,
};

export const HelpCenter = () => {
  const [active, setActive] = useState<SectionKey>('getting-started');
  const ActiveContent = CONTENT[active];
  const activeMeta = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Help Center</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Everything you need to run audits, read reports, and understand how Fricta works.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.key === active;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all"
                style={isActive
                  ? { background: 'rgba(115,66,226,0.12)', border: '1px solid rgba(115,66,226,0.3)', color: '#fff' }
                  : { background: 'transparent', border: '1px solid transparent', color: 'rgba(255,255,255,0.5)' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#9b72fa' : 'rgba(255,255,255,0.35)' }} />
                {s.label}
              </button>
            );
          })}
          <a
            href="mailto:support@fricta.ai"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold mt-4 transition-all hover:text-white"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            Contact Support
          </a>
        </nav>

        <div className="lg:col-span-3 rounded-2xl p-6 lg:p-8" style={card}>
          <h2 className="text-lg font-bold text-white mb-6">{activeMeta.label}</h2>
          <ActiveContent />
        </div>
      </div>
    </div>
  );
};
