export class CognitiveHeuristics {
  static detectDecisionFatigue(actions: any[]): number {
    // Count consecutive form choice selection clicks (selects, dropdown toggles, options, checkboxes)
    let decisionChain = 0;
    let maxChain = 0;

    for (const a of actions) {
      const tgt = (a.target || '').toLowerCase();
      if (
        a.action === 'select' || 
        tgt.includes('dropdown') || 
        tgt.includes('select') || 
        tgt.includes('option') || 
        tgt.includes('checkbox') || 
        tgt.includes('radio')
      ) {
        decisionChain++;
        if (decisionChain > maxChain) {
          maxChain = decisionChain;
        }
      } else {
        decisionChain = 0;
      }
    }
    return maxChain;
  }

  static detectWorkflowDensity(screenshots: any[]): number {
    // Audit layouts to count text fields, selects, inputs per view
    let maxInputs = 0;
    for (const s of screenshots) {
      const layout = s.metadata?.layout;
      if (layout) {
        const inputs = (layout.elements || []).filter((e: any) => 
          e.role === 'input' || e.role === 'select' || e.role === 'textbox'
        ).length;

        if (inputs > maxInputs) {
          maxInputs = inputs;
        }
      }
    }
    return maxInputs;
  }

  static detectHesitationPatterns(thoughts: any[]): number {
    // Count thoughts indicating doubt, confusion, or search, e.g. containing "where", "how", "not sure", "confused", "try"
    let hesitantThoughts = 0;
    for (const t of thoughts) {
      const txt = (t.thought || '').toLowerCase();
      if (
        txt.includes('where') || 
        txt.includes('how') || 
        txt.includes('not sure') || 
        txt.includes('confused') || 
        txt.includes('try') || 
        txt.includes('error') || 
        txt.includes('stuck')
      ) {
        hesitantThoughts++;
      }
    }
    return hesitantThoughts;
  }
}
export default CognitiveHeuristics;
