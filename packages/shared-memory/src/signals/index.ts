import { PrismaClient } from '@fricta/db';

export interface AggregatedSignal {
  signalType: string;
  avgIntensity: number;
  peakIntensity: number;
  sources: string[];
  count: number;
}

export class SharedMemorySignalAggregator {
  constructor(
    private prisma: PrismaClient,
    private orchestrationSessionId: string
  ) {}

  /**
   * Aggregates signals emitted by various agents during the session.
   * Averages intensities and groups details for observability.
   */
  async aggregateSignals(): Promise<AggregatedSignal[]> {
    const sessionId = this.orchestrationSessionId;

    const executions = await this.prisma.agentExecution.findMany({
      where: { orchestrationSessionId: sessionId },
      include: {
        signals: true
      }
    });

    const signalMap: Record<string, { intensities: number[]; sources: Set<string> }> = {};

    for (const exec of executions) {
      for (const sig of exec.signals) {
        // Standardize signalType casing/spaces
        const typeKey = sig.signalType.toUpperCase().trim();
        if (!signalMap[typeKey]) {
          signalMap[typeKey] = {
            intensities: [],
            sources: new Set<string>()
          };
        }
        signalMap[typeKey].intensities.push(sig.intensity);
        signalMap[typeKey].sources.add(exec.agentType);
      }
    }

    const aggregated: AggregatedSignal[] = Object.entries(signalMap).map(([type, data]) => {
      const sum = data.intensities.reduce((acc, val) => acc + val, 0);
      const avg = sum / data.intensities.length;
      const peak = Math.max(...data.intensities);

      return {
        signalType: type,
        avgIntensity: parseFloat(avg.toFixed(3)),
        peakIntensity: parseFloat(peak.toFixed(3)),
        sources: Array.from(data.sources),
        count: data.intensities.length
      };
    });

    // Sort by average intensity descending
    return aggregated.sort((a, b) => b.avgIntensity - a.avgIntensity);
  }
}
