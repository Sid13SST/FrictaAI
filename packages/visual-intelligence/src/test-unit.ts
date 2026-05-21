import { LayoutAnalyzer } from './layout';
import { VisualHeuristicsEngine } from './heuristics';
import { VisualScoringEngine } from './scoring';
import { LayoutElement, LayoutRegion, VisualObservation } from './types';

// Helper function to assert values
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

async function runTests() {
  console.log('=== Running Visual Intelligence Unit Tests ===\n');

  // Test 1: Layout Overlap and Classification
  console.log('1. Testing LayoutAnalyzer:');
  const regions: LayoutRegion[] = [
    { type: 'header', box: { x: 0, y: 0, w: 1280, h: 80 } },
    { type: 'footer', box: { x: 0, y: 640, w: 1280, h: 80 } }
  ];

  const elements: LayoutElement[] = [
    // Overlapping elements
    { id: 'el-1', role: 'button', text: 'Submit', box: { x: 100, y: 100, w: 100, h: 50 } },
    { id: 'el-2', role: 'text', text: 'Error message overlay', box: { x: 150, y: 120, w: 100, h: 40 } }, // Overlaps el-1
    // A CTA button
    { id: 'el-3', role: 'button', text: 'Primary CTA Button', intent: 'primary', box: { x: 300, y: 300, w: 200, h: 60 } },
    // Elements in header
    { id: 'el-h1', role: 'link', text: 'Home', box: { x: 10, y: 10, w: 50, h: 30 } },
    { id: 'el-h2', role: 'link', text: 'About', box: { x: 70, y: 10, w: 50, h: 30 } }
  ];

  const analyzer = new LayoutAnalyzer(regions, elements, 1280, 720);

  const overlaps = analyzer.checkOverlaps();
  assert(overlaps.length === 1, 'Should detect exactly 1 overlap');
  assert(overlaps[0].el1.id === 'el-1' && overlaps[0].el2.id === 'el-2', 'Overlap should be between el-1 and el-2');

  const primaryCTAs = analyzer.getPrimaryCTAs();
  assert(primaryCTAs.length === 1, 'Should find 1 primary CTA');
  assert(primaryCTAs[0].id === 'el-3', 'Primary CTA should be el-3');

  const headerElements = analyzer.getElementsInRegion('header');
  assert(headerElements.length === 2, 'Should find 2 elements in the header region');

  // Test 2: Heuristics Engine
  console.log('\n2. Testing VisualHeuristicsEngine:');
  const heuristicsEngine = new VisualHeuristicsEngine();
  
  // Empty layout to test weak cta & empty state heuristics
  const emptyElements: LayoutElement[] = [
    { id: 'el-welcome', role: 'heading', text: 'Welcome to your dashboard', box: { x: 100, y: 100, w: 300, h: 40 } }
  ];
  const emptyAnalyzer = new LayoutAnalyzer([], emptyElements, 1280, 720);
  const emptyFindings = heuristicsEngine.analyze(emptyAnalyzer, 'screenshot-mock-id');
  
  const hasWeakCTA = emptyFindings.some(f => f.findingType === 'weak_cta');
  const hasEmptyState = emptyFindings.some(f => f.findingType === 'empty_state');
  
  assert(hasWeakCTA, 'Empty layout should trigger weak_cta');
  assert(hasEmptyState, 'Empty layout should trigger empty_state');

  // Analyzer with overlap
  const overlapFindings = heuristicsEngine.analyze(analyzer, 'screenshot-mock-id');
  const hasClutter = overlapFindings.some(f => f.findingType === 'clutter');
  assert(hasClutter, 'Layout with overlapping elements should trigger clutter');

  // Test 3: Scoring Engine
  console.log('\n3. Testing VisualScoringEngine:');
  const scoringEngine = new VisualScoringEngine();

  // Test perfect score
  const perfectScores = scoringEngine.calculateScores([]);
  assert(perfectScores.overallScore === 100, 'Empty findings list should result in a 100 score');
  assert(perfectScores.clarityScore === 100, 'Empty findings list should result in 100 clarity score');

  // Test deductions
  const mockObservations: VisualObservation[] = [
    {
      screenshotId: 'screenshot-mock-id',
      findingType: 'weak_cta',
      severity: 'high', // deduction 15
      title: 'Weak CTA',
      description: 'Test',
      boundingBoxes: [],
      metadata: {}
    },
    {
      screenshotId: 'screenshot-mock-id',
      findingType: 'clutter',
      severity: 'medium', // deduction 10
      title: 'Overlap detected',
      description: 'Test',
      boundingBoxes: [],
      metadata: {}
    }
  ];

  const deductedScores = scoringEngine.calculateScores(mockObservations);
  // discoverability deduction: -15 (weak_cta) -> 85
  // clarity deduction: -10 (clutter) -> 90
  // balance deduction: -10 * 0.6 = -6 (clutter) -> 94
  // navigation deduction: 0 -> 100
  // overall score: clamp(90*0.3 + 85*0.3 + 94*0.2 + 100*0.2) = clamp(27 + 25.5 + 18.8 + 20) = clamp(91.3) = 91
  
  assert(deductedScores.discoverabilityScore === 85, `Discoverability score should be 85, got ${deductedScores.discoverabilityScore}`);
  assert(deductedScores.clarityScore === 90, `Clarity score should be 90, got ${deductedScores.clarityScore}`);
  assert(deductedScores.layoutBalanceScore === 94, `Layout balance score should be 94, got ${deductedScores.layoutBalanceScore}`);
  assert(deductedScores.navigationScore === 100, `Navigation score should be 100, got ${deductedScores.navigationScore}`);
  assert(deductedScores.overallScore === 91, `Overall score should be 91, got ${deductedScores.overallScore}`);

  console.log('\n=============================================');
  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
