export class HeatmapEngine {
  /**
   * Aggregates step telemetry into selector-level friction & attention weights.
   */
  public static calculate(
    pageUrl: string,
    executions: Array<{ replays: any[] }>
  ): any[] {
    const selectorMetrics: Record<
      string,
      {
        clickCount: number;
        hoverCount: number;
        averageHesitationMs: number;
        hesitationCount: number;
        averageFrictionScore: number;
        frictionCount: number;
        attentionWeight: number;
        cognitiveDensity: number;
      }
    > = {};

    for (const exec of executions) {
      for (const step of exec.replays) {
        const selector = step.targetSelector || 'viewport';
        if (!selectorMetrics[selector]) {
          selectorMetrics[selector] = {
            clickCount: 0,
            hoverCount: 0,
            averageHesitationMs: 0,
            hesitationCount: 0,
            averageFrictionScore: 0,
            frictionCount: 0,
            attentionWeight: 0,
            cognitiveDensity: 0,
          };
        }

        const metrics = selectorMetrics[selector];
        if (step.eventType === 'CLICK') {
          metrics.clickCount++;
        } else if (step.eventType === 'HOVER') {
          metrics.hoverCount++;
        }

        if (step.durationMs > 1000) {
          metrics.averageHesitationMs =
            (metrics.averageHesitationMs * metrics.hesitationCount + step.durationMs) /
            (metrics.hesitationCount + 1);
          metrics.hesitationCount++;
        }

        const friction = step.frictionScore !== undefined ? step.frictionScore : 1.0 - step.confidence;
        metrics.averageFrictionScore =
          (metrics.averageFrictionScore * metrics.frictionCount + friction) /
          (metrics.frictionCount + 1);
        metrics.frictionCount++;

        const load = step.cognitiveLoad || 0.5;
        metrics.attentionWeight += 0.25;
        metrics.cognitiveDensity =
          (metrics.cognitiveDensity * (metrics.frictionCount - 1) + load) / metrics.frictionCount;
      }
    }

    return Object.entries(selectorMetrics).map(([selector, data]) => ({
      pageUrl,
      selector,
      clickCount: data.clickCount,
      hoverCount: data.hoverCount,
      averageHesitationMs: Math.round(data.averageHesitationMs),
      averageFrictionScore: Math.min(data.averageFrictionScore, 1.0),
      attentionWeight: Math.min(data.attentionWeight, 1.0),
      cognitiveDensity: Math.min(data.cognitiveDensity, 1.0),
    }));
  }
}
