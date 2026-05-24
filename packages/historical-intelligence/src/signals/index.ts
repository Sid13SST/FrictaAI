import { logger } from '@fricta/shared';

export interface SignalAggregatorResult {
  signalType: string;
  averageIntensity: number;
  maxIntensity: number;
  occurrenceCount: number;
  hotspots: { pageUrl: string; occurrences: number }[];
}

export class LongitudinalSignalAnalyzer {
  /**
   * Processes longitudinal signals (cognitive overload, hesitation delays) across runs.
   */
  static analyze(sessions: any[]): SignalAggregatorResult[] {
    logger.info({ sessionCount: sessions.length }, 'LongitudinalSignalAnalyzer aggregating signals');
    const signalsMap: Record<string, { intensities: number[]; max: number; locations: Record<string, number> }> = {};

    for (const session of sessions) {
      // Gather cognitive signals
      if (session.cognitiveSignals) {
        for (const sig of session.cognitiveSignals) {
          const type = sig.signalType;
          if (!signalsMap[type]) {
            signalsMap[type] = { intensities: [], max: 0.0, locations: {} };
          }
          signalsMap[type].intensities.push(sig.intensity);
          signalsMap[type].max = Math.max(signalsMap[type].max, sig.intensity);
          
          // Use metadata context or fallback as location
          const location = sig.metadata?.url || sig.metadata?.stepType || 'unknown';
          signalsMap[type].locations[location] = (signalsMap[type].locations[location] || 0) + 1;
        }
      }

      // Gather visual findings as signals
      if (session.visualFindings) {
        for (const finding of session.visualFindings) {
          const type = `VISUAL_${finding.findingType.toUpperCase()}`;
          if (!signalsMap[type]) {
            signalsMap[type] = { intensities: [], max: 1.0, locations: {} };
          }
          signalsMap[type].intensities.push(1.0); // Visual finding acts as full flag
          
          const location = finding.screenshot?.pageUrl || 'unknown';
          signalsMap[type].locations[location] = (signalsMap[type].locations[location] || 0) + 1;
        }
      }
    }

    const results: SignalAggregatorResult[] = [];
    for (const [type, data] of Object.entries(signalsMap)) {
      if (data.intensities.length === 0) continue;

      const sum = data.intensities.reduce((a, b) => a + b, 0);
      const avg = sum / data.intensities.length;

      const hotspots = Object.entries(data.locations)
        .map(([pageUrl, count]) => ({ pageUrl, occurrences: count }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 3); // top 3 hotspots

      results.push({
        signalType: type,
        averageIntensity: parseFloat(avg.toFixed(2)),
        maxIntensity: parseFloat(data.max.toFixed(2)),
        occurrenceCount: data.intensities.length,
        hotspots
      });
    }

    return results;
  }
}
