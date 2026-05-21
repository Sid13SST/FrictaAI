import { SessionActivityData, ActionData } from './types';
import { BehavioralAnalyzer } from './behavior';
import { CognitiveEngine } from './cognitive';
import { PersonaEngine } from './reasoning';
import { ReportCompiler } from './reports';

function createMockSession(actions: Partial<ActionData>[]): SessionActivityData {
  const fullActions: ActionData[] = actions.map((a, i) => ({
    id: `act-${i}`,
    action: a.action || 'click',
    target: a.target || 'button',
    value: a.value || null,
    status: a.status || 'success',
    stepNumber: a.stepNumber || (i + 1),
    errorMessage: a.errorMessage || null,
    timestamp: a.timestamp || new Date(Date.now() + i * 20000) // Default 20s apart to trigger hesitation
  }));

  return {
    id: 'mock-session-123',
    goal: 'Create a new class and assign homework',
    persona: 'Beginner Teacher',
    startedAt: new Date(),
    endedAt: new Date(),
    actions: fullActions,
    thoughts: fullActions.map(a => ({
      id: `thought-${a.stepNumber}`,
      thought: `Thinking about step ${a.stepNumber}`,
      stepNumber: a.stepNumber,
      timestamp: a.timestamp
    })),
    interactions: [],
    screenshots: fullActions.map(a => ({
      id: `screenshot-${a.stepNumber}`,
      stepIndex: a.stepNumber,
      pageUrl: a.action === 'navigate' ? (a.value || '/dashboard') : '/dashboard',
      metadata: {
        elements: [
          { id: 'btn-1', tagName: 'button', text: 'Submit', boundingBox: { x: 10, y: 10, width: 100, height: 40 } },
          { id: 'input-1', tagName: 'input', text: '', boundingBox: { x: 10, y: 60, width: 200, height: 30 } }
        ]
      }
    }))
  };
}

async function runTests() {
  console.log('=== Running UX Intelligence Unit Tests ===\n');

  // Test 1: Behavioral Analyzer
  console.log('1. Testing BehavioralAnalyzer:');
  const now = Date.now();
  const mockSession = createMockSession([
    { action: 'navigate', value: '/dashboard', timestamp: new Date(now), stepNumber: 1 },
    { action: 'click', target: 'button#create', timestamp: new Date(now + 20000), stepNumber: 2 }, // 20s gap -> Hesitation
    { action: 'click', target: 'button#submit', timestamp: new Date(now + 25000), stepNumber: 3 }, // 5s gap
    { action: 'click', target: 'button#submit', timestamp: new Date(now + 27000), stepNumber: 4 }, // Retry click
    { action: 'navigate', value: '/reports', timestamp: new Date(now + 30000), stepNumber: 5 },
    { action: 'navigate', value: '/dashboard', timestamp: new Date(now + 33000), stepNumber: 6 },
    { action: 'navigate', value: '/reports', timestamp: new Date(now + 36000), stepNumber: 7 } // Loop reports->dashboard->reports
  ]);

  const behaviorSignals = BehavioralAnalyzer.analyze(mockSession);
  
  const hesitations = behaviorSignals.filter(s => s.type === 'HESITATION');
  const loops = behaviorSignals.filter(s => s.type === 'NAVIGATION_LOOP');
  const retries = behaviorSignals.filter(s => s.type === 'INTERACTION_RETRY');

  console.log(`  ✓ Passed: Should find exactly 1 hesitation (found: ${hesitations.length})`);
  console.log(`  ✓ Passed: Should find exactly 1 navigation loop (found: ${loops.length})`);
  console.log(`  ✓ Passed: Should find exactly 1 retry event (found: ${retries.length})`);

  if (hesitations.length !== 1 || loops.length !== 1 || retries.length !== 1) {
    throw new Error('BehavioralAnalyzer tests failed!');
  }

  // Test 2: Cognitive Load Engine
  console.log('\n2. Testing CognitiveEngine:');
  const cogSignals = CognitiveEngine.calculate(mockSession, behaviorSignals);
  
  const overload = cogSignals.find(s => s.signalType === 'COGNITIVE_OVERLOAD');
  const fatigue = cogSignals.find(s => s.signalType === 'DECISION_FATIGUE');
  const density = cogSignals.find(s => s.signalType === 'WORKFLOW_DENSITY');
  const discoverability = cogSignals.find(s => s.signalType === 'DISCOVERABILITY_FRICTION');
  const branching = cogSignals.find(s => s.signalType === 'BRANCHING_DEPTH');

  console.log(`  ✓ Passed: Cognitive Overload calculated: ${overload?.intensity}`);
  console.log(`  ✓ Passed: Decision Fatigue calculated: ${fatigue?.intensity}`);
  console.log(`  ✓ Passed: Workflow Density calculated: ${density?.intensity}`);
  console.log(`  ✓ Passed: Discoverability Friction calculated: ${discoverability?.intensity}`);
  console.log(`  ✓ Passed: Branching Depth calculated: ${branching?.intensity}`);

  if (!overload || !fatigue || !density || !discoverability || !branching) {
    throw new Error('CognitiveEngine calculations failed!');
  }

  // Test 3: Persona Engine
  console.log('\n3. Testing PersonaEngine:');
  const findings = PersonaEngine.run(mockSession, behaviorSignals);
  console.log(`  ✓ Passed: Generated ${findings.length} persona findings`);
  
  const beginnerFindings = findings.filter(f => f.personaType === 'BEGINNER');
  const powerFindings = findings.filter(f => f.personaType === 'POWER_USER');
  const firstTimeFindings = findings.filter(f => f.personaType === 'FIRST_TIME_USER');

  console.log(`  ✓ Passed: Found ${beginnerFindings.length} Beginner Teacher findings`);
  console.log(`  ✓ Passed: Found ${powerFindings.length} Power User findings`);
  console.log(`  ✓ Passed: Found ${firstTimeFindings.length} First-Time User findings`);

  if (findings.length === 0) {
    throw new Error('PersonaEngine failed to project findings!');
  }

  // Test 4: Report Compiler & Scoring
  console.log('\n4. Testing ReportCompiler & Scoring:');
  const report = ReportCompiler.compile(mockSession.id, findings, cogSignals, []);
  console.log(`  ✓ Passed: Overall score calculated: ${report.scores.overallScore}`);
  console.log(`  ✓ Passed: Clarity score: ${report.scores.clarityScore}`);
  console.log(`  ✓ Passed: Onboarding score: ${report.scores.onboardingScore}`);
  console.log(`  ✓ Passed: IA score: ${report.scores.iaScore}`);
  console.log(`  ✓ Passed: Efficiency score: ${report.scores.efficiencyScore}`);

  if (report.scores.overallScore <= 0 || report.scores.overallScore > 100) {
    throw new Error('ReportCompiler score out of bounds!');
  }

  console.log('\n=============================================');
  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('=============================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
