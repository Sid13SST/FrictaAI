import { ExecutiveSummaryEngine } from './executive';
import { TimelineCompiler } from './timeline';
import { ExportEngine } from './export';
import { UnifiedUXReportPayload } from './types';

// Mock report payload for test validation
const mockReport: UnifiedUXReportPayload = {
  session: {
    id: "test-session-uuid-12345",
    goal: "Verify user checkout workflow and test payment gateway responses",
    persona: "Beginner User",
    startedAt: new Date("2026-05-21T10:00:00Z"),
    endedAt: new Date("2026-05-21T10:02:30Z"),
    stepCount: 4
  },
  scores: {
    clarityScore: 78,
    onboardingScore: 62,
    iaScore: 82,
    efficiencyScore: 70,
    overallScore: 73
  },
  uxFindings: [
    {
      id: "ux-1",
      workflowSessionId: "test-session-uuid-12345",
      findingType: "ONBOARDING_FRICTION",
      severity: "HIGH",
      personaType: "BEGINNER",
      title: "Hesitation during initial signup",
      description: "User hovered over email form field for 18 seconds without entering text.",
      evidence: "Occurred on Step 1, input focus latency was 18200ms",
      recommendation: "Provide inline placeholder helpers and decrease density.",
      timestamp: new Date("2026-05-21T10:00:15Z")
    },
    {
      id: "ux-2",
      workflowSessionId: "test-session-uuid-12345",
      findingType: "IA_CONFUSION",
      severity: "CRITICAL",
      personaType: "FIRST_TIME_USER",
      title: "Menu path route confusion",
      description: "User repeatedly toggled navigation sidebar menu options in a route loop.",
      evidence: "Occurred on Step 3, clicked route 4 times in 10 seconds",
      recommendation: "Group checkout parameters together under a single prominent billing layout section.",
      timestamp: new Date("2026-05-21T10:01:45Z")
    }
  ],
  cognitiveSignals: [
    {
      id: "cog-1",
      workflowSessionId: "test-session-uuid-12345",
      signalType: "COGNITIVE_OVERLOAD",
      intensity: 0.85,
      metadata: { stepIndex: 3 },
      timestamp: new Date("2026-05-21T10:01:50Z")
    },
    {
      id: "cog-2",
      workflowSessionId: "test-session-uuid-12345",
      signalType: "DISCOVERABILITY_FRICTION",
      intensity: 0.55,
      metadata: { stepIndex: 1 },
      timestamp: new Date("2026-05-21T10:00:20Z")
    }
  ],
  visualFindings: [
    {
      id: "vis-1",
      workflowSessionId: "test-session-uuid-12345",
      screenshotId: "ss-1",
      findingType: "clutter",
      severity: "medium",
      title: "High information density",
      description: "Step 1 viewport is cluttered with non-essential marketing cards.",
      boundingBoxes: [
        { x: 100, y: 150, w: 200, h: 400, label: "Ads Card" }
      ],
      metadata: { stepIndex: 1 },
      timestamp: new Date("2026-05-21T10:00:10Z")
    }
  ],
  personaProfiles: []
};

// Mock raw action thought timeline inputs
const mockActions = [
  { id: "act-1", stepNumber: 1, action: "click", target: "button.signup", value: null, status: "completed", errorMessage: null, timestamp: new Date("2026-05-21T10:00:05Z") },
  { id: "act-2", stepNumber: 3, action: "click", target: "button.billing", value: null, status: "failed", errorMessage: "element checkout button not click-intercepted", timestamp: new Date("2026-05-21T10:01:40Z") }
];

const mockThoughts = [
  { id: "th-1", stepNumber: 1, thought: "Signing up is straightforward, look for credentials field.", timestamp: new Date("2026-05-21T10:00:03Z") },
  { id: "th-2", stepNumber: 3, thought: "Where is the submit billing button? The modal is overlapping.", timestamp: new Date("2026-05-21T10:01:35Z") }
];

function runTest() {
  console.log("=== START FRICTA REPORT ENGINE UNIT VERIFICATION ===");

  // 1. Validate Executive synthesis
  console.log("\n[1/3] Testing Executive Summary Synthesis...");
  const execSummary = ExecutiveSummaryEngine.synthesize(mockReport);
  console.log(`Grade: ${execSummary.overallUXGrade} (Expected: C)`);
  console.log(`Friction Level: ${execSummary.onboardingFrictionLevel} (Expected: HIGH)`);
  console.log(`Discoverability Risk: ${execSummary.discoverabilityRiskLevel} (Expected: CRITICAL/HIGH)`);
  console.log("Synthesized Insights:", execSummary.synthesizedInsights);

  if (execSummary.overallUXGrade !== 'C') {
    throw new Error(`Grade mismatch: got ${execSummary.overallUXGrade}, expected C`);
  }

  // 2. Validate Timeline compilation
  console.log("\n[2/3] Testing Timeline Compiler...");
  const compiledTimeline = TimelineCompiler.compile(
    mockActions,
    mockThoughts,
    mockReport.uxFindings,
    mockReport.cognitiveSignals,
    mockReport.visualFindings
  );

  console.log(`Compiled timeline event count: ${compiledTimeline.length}`);
  compiledTimeline.forEach(e => {
    console.log(` - S${e.stepIndex} [${e.eventType}] ${e.title}`);
  });

  if (compiledTimeline.length < 5) {
    throw new Error(`Timeline event count too low: got ${compiledTimeline.length}`);
  }

  // Check chronological sorting order
  for (let i = 0; i < compiledTimeline.length - 1; i++) {
    const current = compiledTimeline[i];
    const next = compiledTimeline[i + 1];
    if (current.stepIndex > next.stepIndex) {
      throw new Error(`Timeline sorting error: S${current.stepIndex} placed before S${next.stepIndex}`);
    }
  }
  console.log("Timeline sorted correctly!");

  // 3. Validate Export formatting
  console.log("\n[3/3] Testing Export Formats...");
  const md = ExportEngine.toMarkdown(mockReport, execSummary);
  const textSheet = ExportEngine.toTextSheet(mockReport, execSummary);
  const jsonDump = ExportEngine.toDeveloperJson(mockReport, execSummary);

  console.log(`Markdown report size: ${md.length} characters`);
  console.log(`Text summary size: ${textSheet.length} characters`);
  console.log(`JSON dump size: ${jsonDump.length} characters`);

  if (!md.includes("Fricta AI UX Intelligence Report")) {
    throw new Error("Markdown export format invalid");
  }
  if (!textSheet.includes("FRICTA UX REPORT SUMMARY SHEET")) {
    throw new Error("Text summary sheet export format invalid");
  }
  if (!JSON.parse(jsonDump).assessment) {
    throw new Error("JSON export format invalid");
  }

  console.log("\n=== ALL REPORT ENGINE UNIT VERIFICATIONS PASSED ===");
}

runTest();
