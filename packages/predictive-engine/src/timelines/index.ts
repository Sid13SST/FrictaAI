import { TimelineEventInput } from '../types';

export class TimelineRiskPredictor {
  public static calculate(
    stepsCount: number,
    traits: any
  ): TimelineEventInput[] {
    const events: TimelineEventInput[] = [];

    // 1. Friction Escalation forecast
    events.push({
      stepIndex: Math.min(2, stepsCount - 1),
      eventType: 'FRICTION_ESCALATION',
      timeOffsetMs: 4500,
      predictedIntensity: 0.68,
      description: 'Friction escalation predicted: Multiple form input fields in close sequence accumulate cognitive load.',
    });

    // 2. Confidence collapse threshold
    if (traits.navigationConfidence < 0.6) {
      events.push({
        stepIndex: Math.min(3, stepsCount - 1),
        eventType: 'CONFIDENCE_COLLAPSE',
        timeOffsetMs: 6800,
        predictedIntensity: 0.85,
        description: 'Confidence collapse warning: Persona patience thresholds exceeded on non-obvious navigation selectors.',
      });
    }

    // 3. Cognitive Overload prediction
    events.push({
      stepIndex: Math.min(1, stepsCount - 1),
      eventType: 'COGNITIVE_OVERLOAD',
      timeOffsetMs: 2500,
      predictedIntensity: 0.52,
      description: 'Cognitive load threshold check: Information density spikes as user reads layout guidelines.',
    });

    // 4. Abandonment Trend trigger
    events.push({
      stepIndex: stepsCount - 1,
      eventType: 'ABANDONMENT_TREND',
      timeOffsetMs: 9000,
      predictedIntensity: 0.74,
      description: 'Abandonment risk reaches peak: User approaches checkout submission without clear security trust signals.',
    });

    return events;
  }
}
