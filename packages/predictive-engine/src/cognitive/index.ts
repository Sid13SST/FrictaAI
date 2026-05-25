export class CognitivePressurePredictor {
  public static calculate(
    stepsCount: number,
    traits: any,
    elementsCount: number
  ) {
    const dataPoints: any[] = [];

    for (let stepIndex = 0; stepIndex < stepsCount; stepIndex++) {
      const overloadRisk = Math.min(1.0, 0.2 + stepIndex * 0.15 * (1.0 - traits.cognitiveTolerance));
      const decisionFatigue = Math.min(1.0, (elementsCount * 0.08) + stepIndex * 0.05);
      const attentionDecay = Math.max(0.0, traits.attentionStability - stepIndex * 0.06);

      dataPoints.push({
        stepIndex,
        overloadRisk,
        decisionFatigue,
        attentionDecay,
      });
    }

    return dataPoints;
  }
}
