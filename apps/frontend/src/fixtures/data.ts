/**
 * DEV-ONLY FIXTURE DATA — never shipped.
 *
 * Hand-written sample payloads shaped like the backend's responses, used by
 * the fixture harness (see ./README.md) to render pages without a backend,
 * a database, Clerk, or any LLM call. Nothing here comes from a real audit.
 */

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

export const SESSION_COMPLETED = 'fx-session-completed-0001';
export const SESSION_RUNNING = 'fx-session-running-0002';
export const SESSION_QUEUED = 'fx-session-queued-0003';
export const SESSION_FAILED = 'fx-session-failed-0004';

export const projects = [
  { id: 'fx-project-1', projectName: 'Acme Storefront', websiteUrl: 'https://shop.acme-fixture.example', createdAt: iso(60 * 24 * 12) },
  { id: 'fx-project-2', projectName: 'Northwind Onboarding Portal (Marketing + Docs)', websiteUrl: 'https://onboarding.northwind-fixture.example/start/welcome', createdAt: iso(60 * 24 * 6) },
  { id: 'fx-project-3', projectName: 'Lumen Docs', websiteUrl: 'https://docs.lumen-fixture.example', createdAt: iso(60 * 24 * 2) },
  { id: 'fx-project-4', projectName: 'Pioneer Billing', websiteUrl: 'https://billing.pioneer-fixture.example', createdAt: iso(60 * 5) },
];

export const workflowsByProject: Record<string, unknown[]> = {
  'fx-project-1': [
    { id: SESSION_RUNNING, projectId: 'fx-project-1', goal: 'Add a product to the cart and reach checkout as a first-time visitor', persona: 'First-Time Visitor', status: 'RUNNING', startedAt: iso(3), endedAt: null, createdAt: iso(3) },
    { id: SESSION_COMPLETED, projectId: 'fx-project-1', goal: 'Find the returns policy and start a return', persona: 'Tech-Savvy User', status: 'COMPLETED', startedAt: iso(180), endedAt: iso(174), createdAt: iso(180) },
    { id: SESSION_FAILED, projectId: 'fx-project-1', goal: 'Apply a discount code at checkout', persona: 'Impatient Shopper', status: 'FAILED', startedAt: iso(60 * 26), endedAt: iso(60 * 26 - 2), createdAt: iso(60 * 26) },
  ],
  'fx-project-2': [
    { id: SESSION_QUEUED, projectId: 'fx-project-2', goal: 'Complete account sign-up and invite a teammate', persona: 'Non-Technical User', status: 'PENDING', startedAt: iso(1), endedAt: null, createdAt: iso(1) },
    { id: 'fx-session-completed-0005', projectId: 'fx-project-2', goal: 'Locate pricing and compare the two cheapest plans', persona: 'Budget-Conscious Buyer', status: 'COMPLETED', startedAt: iso(60 * 30), endedAt: iso(60 * 30 - 5), createdAt: iso(60 * 30) },
  ],
  'fx-project-3': [],
  'fx-project-4': [],
};

export const reports = [
  { id: 'fx-report-1', sessionId: SESSION_COMPLETED, score: 62, uxFindingsCount: 7, createdAt: iso(174), summary: 'Returns flow is discoverable from the footer only. The start-a-return form rejects order numbers with a leading zero and gives no inline guidance.' },
  { id: 'fx-report-2', sessionId: 'fx-session-completed-0005', score: 84, uxFindingsCount: 3, createdAt: iso(60 * 30 - 5), summary: 'Pricing is clear and comparable. Minor contrast issues on the plan toggle and an ambiguous "Contact us" CTA on the enterprise tier.' },
  { id: 'fx-report-3', sessionId: SESSION_FAILED, score: 38, uxFindingsCount: 11, createdAt: iso(60 * 26 - 2), summary: 'Checkout discount field is hidden behind a collapsed accordion; applying an invalid code clears the whole form.' },
];

const uxFindings = [
  { id: 'fx-finding-1', findingType: 'DISCOVERABILITY', severity: 'HIGH', personaType: 'Tech-Savvy User', title: 'Returns link is only reachable from the footer', description: 'The agent scrolled the full page twice before finding "Returns" in the footer. No entry point exists in the account menu or order history.', recommendation: 'Add a "Start a return" action to each order in order history and to the account menu.', evidence: 'Observed at step 3: two full-page scrolls before the footer link was found.', step: 3, confidence: 0.91, status: 'OPEN', resolutionNotes: null, timestamp: iso(178), workflowSessionId: SESSION_COMPLETED },
  { id: 'fx-finding-2', findingType: 'FORM_VALIDATION', severity: 'CRITICAL', personaType: 'Tech-Savvy User', title: 'Order number field rejects valid input with no explanation', description: 'Order numbers with a leading zero are rejected with a generic "Invalid" message. The field has no format hint.', recommendation: 'Accept leading zeros, and show the expected format beneath the field.', evidence: 'Observed at step 5: three rejected submissions of order number 004521.', step: 5, confidence: 0.88, status: 'UNDER_REVIEW', resolutionNotes: 'Reproduced on staging.', timestamp: iso(177), workflowSessionId: SESSION_COMPLETED },
  { id: 'fx-finding-3', findingType: 'CLARITY', severity: 'MEDIUM', personaType: 'Tech-Savvy User', title: 'Ambiguous primary button label "Continue"', description: 'The final step of the return form uses "Continue" although it submits the request.', recommendation: 'Rename the button to "Submit return request".', evidence: 'Observed at step 6: the submit control is labelled "Continue".', step: 6, confidence: 0.74, status: 'OPEN', resolutionNotes: null, timestamp: iso(176), workflowSessionId: SESSION_COMPLETED },
  { id: 'fx-finding-4', findingType: 'ACCESSIBILITY', severity: 'LOW', personaType: 'Tech-Savvy User', title: 'Low contrast on helper text', description: 'Helper text under the reason dropdown is #8a8a8a on white (3.4:1).', recommendation: 'Darken helper text to at least 4.5:1.', evidence: 'Observed at step 6: helper text colour #8a8a8a on #ffffff.', step: 6, confidence: 0.69, status: 'RESOLVED', resolutionNotes: 'Fixed in design tokens.', timestamp: iso(175), workflowSessionId: SESSION_COMPLETED },
];

const screenshots = [0, 1, 2, 3, 4, 5, 6].map(i => ({
  id: `fx-shot-${i}`, workflowSessionId: SESSION_COMPLETED, stepIndex: i, filePath: `fixture/step-${i}.svg`, thumbnailPath: `fixture/step-${i}.svg`,
  pageUrl: `https://shop.acme-fixture.example/${['', 'account', 'orders', 'help', 'returns', 'returns/new', 'returns/new'][i]}`,
  actionContext: ['navigate', 'click', 'scroll', 'scroll', 'click', 'type', 'click'][i], viewportWidth: 1280, viewportHeight: 800, timestamp: iso(180 - i),
}));

const visualFindings = [
  { id: 'fx-vf-1', workflowSessionId: SESSION_COMPLETED, screenshotId: 'fx-shot-5', findingType: 'CONTRAST', severity: 'MEDIUM', title: 'Low-contrast helper text', description: 'Helper text fails WCAG AA at step 5', boundingBox: { x: 320, y: 410, width: 360, height: 28 }, metadata: { stepIndex: 5 }, confidence: 0.8, timestamp: iso(176) },
];

const cognitiveSignals = [
  { id: 'fx-sig-1', workflowSessionId: SESSION_COMPLETED, signalType: 'COGNITIVE_OVERLOAD', intensity: 0.62, metadata: { stepIndex: 3 }, timestamp: iso(178) },
  { id: 'fx-sig-2', workflowSessionId: SESSION_COMPLETED, signalType: 'NAVIGATION_COMPLEXITY', intensity: 0.78, metadata: { stepIndex: 3 }, timestamp: iso(178) },
  { id: 'fx-sig-3', workflowSessionId: SESSION_COMPLETED, signalType: 'INFORMATION_DENSITY', intensity: 0.31, metadata: { stepIndex: 5 }, timestamp: iso(177) },
  { id: 'fx-sig-4', workflowSessionId: SESSION_COMPLETED, signalType: 'DECISION_FATIGUE', intensity: 0.44, metadata: { stepIndex: 5 }, timestamp: iso(177) },
];

export const reportPayload = {
  session: { id: SESSION_COMPLETED, goal: 'Find the returns policy and start a return', persona: 'Tech-Savvy User', startedAt: iso(180), endedAt: iso(174), stepCount: 7 },
  scores: { clarityScore: 58, onboardingScore: 71, iaScore: 49, efficiencyScore: 66, overallScore: 62 },
  uxFindings,
  cognitiveSignals,
  visualFindings,
  personaProfiles: [
    { id: 'fx-persona-1', personaType: 'Tech-Savvy User', frictionScore: 41, completionLikelihood: 0.72, summary: 'Completes the flow but loses time locating the entry point.' },
    { id: 'fx-persona-2', personaType: 'Non-Technical User', frictionScore: 68, completionLikelihood: 0.38, summary: 'Likely abandons at the order number validation error.' },
  ],
};

export const executiveSummary = {
  overallUXGrade: 'C', overallScore: 62, onboardingFrictionLevel: 'MEDIUM', discoverabilityRiskLevel: 'HIGH', majorFrictionStepIndices: [3, 5],
  synthesizedInsights: [
    'The returns flow works end-to-end but is hard to find: the only entry point is a footer link.',
    'Form validation on the order number is the single largest source of friction and blocks a subset of real orders.',
    'Button labels in the final step do not describe their outcome.',
  ],
};

export const exportBundle = {
  markdown: '# Fricta fixture report\n\nThis is fixture data, not a real audit.\n',
  textSheet: 'Fricta fixture report — not a real audit.',
  developerJson: JSON.stringify({ fixture: true }, null, 2),
};

const timelineEvents = screenshots.flatMap((s, i) => ([
  { id: `fx-tl-a-${i}`, stepIndex: i, timestamp: s.timestamp, eventType: 'ACTION', title: `${s.actionContext} ${i === 0 ? 'homepage' : 'element'}`, description: `Agent performed "${s.actionContext}" on ${s.pageUrl}`, metadata: { action: s.actionContext, status: 'success' } },
  { id: `fx-tl-t-${i}`, stepIndex: i, timestamp: s.timestamp, eventType: 'THOUGHT', title: 'Agent reasoning', description: ['I need to find where returns are handled.', 'The account menu has no returns entry.', 'Order history shows orders but no return action.', 'Scrolling to the footer to look for policy links.', 'Found "Returns" in the footer. Opening it.', 'The form asks for an order number; trying the one from order history.', 'Validation failed without telling me why. Trying without the leading zero.'][i], metadata: {} },
]));

export const reportTimeline = { timeline: timelineEvents, screenshots };

export const recommendations = {
  recommendations: [
    { title: 'Surface returns from order history', description: 'Add a per-order "Start a return" action so the flow starts where users already are.', evidence: 'Observed at step 3.', severity: 'HIGH', whyItMatters: 'Task-driven users look for returns next to the order, not in the footer.', remedySteps: ['Add "Start a return" to each order row', 'Link to it from the account menu', 'Keep the footer link as a fallback'] },
    { title: 'Fix order-number validation', description: 'Accept leading zeros and show the expected format beneath the field.', evidence: 'Observed at step 5.', severity: 'CRITICAL', whyItMatters: 'A subset of real orders cannot be returned at all today.', remedySteps: ['Treat the order number as a string', 'Add a format hint', 'Replace "Invalid" with a specific message'] },
  ],
};

// ── Live monitor ────────────────────────────────────────────────────────────
export const monitorSessions: Record<string, unknown> = {
  [SESSION_RUNNING]: { session: { id: SESSION_RUNNING, status: 'RUNNING', stepCount: 9, model: 'fixture-model', goal: 'Add a product to the cart and reach checkout as a first-time visitor', persona: 'First-Time Visitor', startedAt: iso(3), createdAt: iso(3), project: { projectName: projects[0].projectName, websiteUrl: projects[0].websiteUrl } }, isActive: true },
  [SESSION_QUEUED]: { session: { id: SESSION_QUEUED, status: 'PENDING', stepCount: 0, model: 'fixture-model', goal: 'Complete account sign-up and invite a teammate', persona: 'Non-Technical User', startedAt: iso(1), createdAt: iso(1), project: { projectName: projects[1].projectName, websiteUrl: projects[1].websiteUrl } }, isActive: true },
  [SESSION_COMPLETED]: { session: { id: SESSION_COMPLETED, status: 'COMPLETED', stepCount: 7, model: 'fixture-model', goal: 'Find the returns policy and start a return', persona: 'Tech-Savvy User', startedAt: iso(180), createdAt: iso(180), endedAt: iso(174), project: { projectName: projects[0].projectName, websiteUrl: projects[0].websiteUrl } }, isActive: false },
  [SESSION_FAILED]: { session: { id: SESSION_FAILED, status: 'FAILED', stepCount: 4, model: 'fixture-model', goal: 'Apply a discount code at checkout', persona: 'Impatient Shopper', startedAt: iso(60 * 26), createdAt: iso(60 * 26), endedAt: iso(60 * 26 - 2), project: { projectName: projects[0].projectName, websiteUrl: projects[0].websiteUrl } }, isActive: false },
};

export const monitorThoughts = {
  thoughts: [
    'The homepage loaded. I see a hero banner and a product grid below it. I will look for a product to add to the cart.',
    'The first product card has no visible "Add to cart" button — only an image and a price. I will open the product page.',
    'On the product page the size selector is required but nothing indicates that. The "Add to cart" button is disabled with no explanation.',
    'Selected size M. The button is enabled now. Clicking "Add to cart".',
    'A toast confirmed the item was added, but it disappeared in under two seconds and the cart icon count did not update.',
  ].map((thought, i) => ({ id: `fx-thought-${i}`, thought, stepNumber: i + 1, timestamp: iso(3 - i * 0.4) })),
};

export const monitorActions = {
  actions: [
    { action: 'navigate', target: 'https://shop.acme-fixture.example', status: 'success' },
    { action: 'scroll', target: 'product grid', status: 'success' },
    { action: 'click', target: 'product card "Trail Runner 2"', status: 'success' },
    { action: 'click', target: 'button "Add to cart"', status: 'failed', errorMessage: 'Element is disabled' },
    { action: 'click', target: 'size option "M"', status: 'success' },
    { action: 'click', target: 'button "Add to cart"', status: 'success' },
    { action: 'wait', target: 'cart badge update', status: 'success' },
    { action: 'click', target: 'cart icon in the header navigation bar', status: 'success' },
    { action: 'click', target: 'button "Proceed to checkout"', status: 'success' },
  ].map((a, i) => ({ id: `fx-action-${i}`, stepNumber: i + 1, timestamp: iso(3 - i * 0.3), ...a })),
};

// ── Investigation console ───────────────────────────────────────────────────
const AGENT_TYPES = ['VISUAL_AGENT', 'COGNITIVE_AGENT', 'ACCESSIBILITY_AGENT', 'NAVIGATION_AGENT'];

export const consoleData = {
  overview: {
    session: { id: 'fx-orch-1', workflowSessionId: SESSION_COMPLETED, status: 'COMPLETED', startedAt: iso(173), completedAt: iso(170), metadata: {}, goal: 'Find the returns policy and start a return' },
    workflowSession: { status: 'COMPLETED', stepCount: 7, startedAt: iso(180), endedAt: iso(174) },
    agents: AGENT_TYPES.map((agentType, i) => ({ id: `fx-agent-${i}`, agentType, status: i === 3 ? 'FAILED' : 'COMPLETED', task: `Analyze session from the ${agentType.replace('_AGENT', '').toLowerCase()} perspective`, startedAt: iso(173), completedAt: iso(171) })),
    health: { duration: 184, tokenUsage: 48213, retryCount: 1, completionStatus: 'COMPLETED' },
    severity: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 1 },
    insightsCount: 2,
  },
  timeline: {
    timeline: [
      { id: 'fx-ct-1', type: 'DELEGATION', timestamp: iso(173), source: 'UX_ORCHESTRATOR', target: 'VISUAL_AGENT', title: 'Delegated to VISUAL_AGENT', description: 'Agent UX_ORCHESTRATOR delegated control task: "ANALYZE_SCREENSHOTS"', metadata: {} },
      { id: 'fx-ct-2', type: 'SCREENSHOT', timestamp: iso(172.5), source: 'VISUAL_AGENT', title: 'Captured screenshot at step 3', description: 'Captured screenshot of url: https://shop.acme-fixture.example/help', metadata: { stepIndex: 3, filePath: 'fixture/step-3.svg', pageUrl: 'https://shop.acme-fixture.example/help', viewport: '1280x800' } },
      { id: 'fx-ct-3', type: 'REASONING', timestamp: iso(172), source: 'COGNITIVE_AGENT', title: 'COGNITIVE_AGENT reasoning step', description: 'Repeated scrolling suggests the user could not locate the entry point.', metadata: { stepType: 'ANALYSIS' } },
      { id: 'fx-ct-4', type: 'FINDING', timestamp: iso(171.5), source: 'UX_ORCHESTRATOR', title: uxFindings[1].title, description: uxFindings[1].description, metadata: { severity: 'CRITICAL', persona: 'Tech-Savvy User', recommendation: uxFindings[1].recommendation } },
      { id: 'fx-ct-5', type: 'RECOVERY', timestamp: iso(171), source: 'NAVIGATION_AGENT', title: 'NAVIGATION_AGENT execution failure', description: 'Attempting automated fallback / error recovery path.', metadata: { error: 'Fixture timeout' } },
      { id: 'fx-ct-6', type: 'CORRELATION', timestamp: iso(170.5), source: 'VISUAL_AGENT', title: 'Memory Sync Event: FINDING_SHARED', description: 'Agent VISUAL_AGENT updated shared memory with keys: finding, stepIndex', metadata: {} },
    ],
  },
  evidence: {
    screenshots, uxFindings, visualFindings, cognitiveSignals,
    correlations: [{ id: 'fx-corr-1', orchestrationSessionId: 'fx-orch-1', title: 'Validation failure coincides with hesitation spike', description: 'Visual and cognitive agents independently flagged step 5.', severity: 'HIGH', confidence: 0.83, sourceAgents: ['VISUAL_AGENT', 'COGNITIVE_AGENT'], evidence: { stepIndex: 5 }, timestamp: iso(171) }],
  },
  insights: {
    insights: [
      { id: 'fx-insight-1', orchestrationSessionId: 'fx-orch-1', title: 'Returns flow is effectively hidden', summary: 'Three agents agree the entry point is undiscoverable for task-driven users.', description: 'Three agents agree the entry point is undiscoverable for task-driven users.', severity: 'HIGH', confidence: 0.9, contributingAgents: ['VISUAL_AGENT', 'COGNITIVE_AGENT', 'NAVIGATION_AGENT'], recommendation: 'Add return actions to order history.', timestamp: iso(170) },
      { id: 'fx-insight-2', orchestrationSessionId: 'fx-orch-1', title: 'Validation copy blocks recovery', summary: 'Generic "Invalid" errors prevent self-correction.', description: 'Generic "Invalid" errors prevent self-correction.', severity: 'CRITICAL', confidence: 0.86, contributingAgents: ['COGNITIVE_AGENT', 'ACCESSIBILITY_AGENT'], recommendation: 'Explain the expected format inline.', timestamp: iso(170) },
    ],
  },
  agents: {
    agents: AGENT_TYPES.map((agentType, i) => ({
      id: `fx-agent-${i}`, agentType, status: i === 3 ? 'FAILED' : 'COMPLETED',
      scopedResponsibilities: `Fixture description of what the ${agentType} is responsible for.`,
      findings: i < 2 ? [{ id: `fx-af-${i}`, title: uxFindings[i].title, description: uxFindings[i].description, severity: uxFindings[i].severity, evidence: uxFindings[i].evidence }] : [],
      reasoningTraces: [{ id: `fx-trace-${i}`, stepType: 'ANALYSIS', summary: 'Reviewed captured steps and compared against heuristics.', evidence: {}, timestamp: iso(172) }],
      delegationHistory: [{ id: `fx-del-${i}`, fromAgent: 'UX_ORCHESTRATOR', toAgent: agentType, eventType: 'ANALYZE', timestamp: iso(173) }],
      signals: [],
      confidence: 0.85 - i * 0.05,
    })),
  },
  memory: {
    events: [
      { id: 'fx-mem-1', eventType: 'FINDING_SHARED', sourceAgent: 'VISUAL_AGENT', payload: { finding: 'low contrast helper text', stepIndex: 5 }, timestamp: iso(172) },
      { id: 'fx-mem-2', eventType: 'CONTEXT_UPDATED', sourceAgent: 'COGNITIVE_AGENT', payload: { hesitation: true, stepIndex: 3 }, timestamp: iso(171.5) },
    ],
  },
  'replay-sync': {
    sessionId: SESSION_COMPLETED, totalSteps: screenshots.length,
    frames: screenshots.map((s, i) => ({
      stepIndex: s.stepIndex, timestamp: s.timestamp,
      screenshot: { id: s.id, filePath: s.filePath, pageUrl: s.pageUrl, actionContext: s.actionContext },
      action: { type: s.actionContext, target: i === 0 ? s.pageUrl : 'page element', value: null, status: 'success' },
      thoughts: [timelineEvents[i * 2 + 1].description],
      findings: uxFindings.filter(f => f.step === i).map(f => ({ id: f.id, title: f.title, severity: f.severity, recommendation: f.recommendation })),
    })),
  },
};

// ── Runtime telemetry ───────────────────────────────────────────────────────
export const runtimeTelemetry = {
  success: true,
  telemetry: {
    activeSessions: 2, totalErrors: 1,
    queues: [
      { name: 'workflow-execution-queue', active: 1, waiting: 1, completed: 148, failed: 3, delayed: 0 },
      { name: 'ux-orchestration-queue', active: 0, waiting: 0, completed: 96, failed: 1, delayed: 0 },
      { name: 'report-export-processing-queue', active: 0, waiting: 0, completed: 41, failed: 0, delayed: 2 },
    ],
    workers: [
      { workerId: 'worker-fixture-a1', pid: 4821, cpuUsage: 37, memoryUsage: 412, activeJobs: 1 },
      { workerId: 'worker-fixture-b2-with-a-long-hostname-suffix', pid: 4907, cpuUsage: 4, memoryUsage: 286, activeJobs: 0 },
    ],
    browserPool: { activeContexts: 1, idleContexts: 3, totalLaunched: 212, recycledCount: 208, contextLeaseAvgMs: 48300 },
  },
};

export const runtimeTelemetryEmpty = {
  success: true,
  telemetry: { activeSessions: 0, totalErrors: 0, queues: [], workers: [], browserPool: { activeContexts: 0, idleContexts: 0, totalLaunched: 0, recycledCount: 0, contextLeaseAvgMs: 0 } },
};

export const sessionRuntime = {
  success: true, recoveryCount: 1,
  checkpoint: { lastMilestone: 'REPORT_COMPILED', completedTaskIds: ['a', 'b', 'c'], failedTaskIds: ['d'] },
};
