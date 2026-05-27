import { ReportLayoutStructure, ExecutiveReportSection } from '../types';

export class ReportTemplateBuilder {
  /**
   * Generates standard sections based on selected layoutType.
   */
  static buildTemplateStructure(layoutType: string, customOptions: any = {}): ReportLayoutStructure {
    const accentColor = customOptions.accentColor || '#10b981'; // Mint/Emerald default
    const sections: ExecutiveReportSection[] = [];

    switch (layoutType) {
      case 'RISK_REPORT':
        sections.push(
          {
            id: 'sec-risk-overview',
            title: 'Critical UX Risks & Structural Hazards',
            content: 'Summary of detected cognitive traps, input errors, and layout clutter.',
            type: 'RISK_OVERVIEW'
          },
          {
            id: 'sec-evidence',
            title: 'Visual Evidence Log',
            content: 'Chronological screenshot catalog showcasing highlighted friction regions.',
            type: 'EVIDENCE_GALLERY'
          }
        );
        break;

      case 'PRODUCT_RELEASE':
        sections.push(
          {
            id: 'sec-summary',
            title: 'Release Readiness Assessment',
            content: 'Overall system rating prior to production deployment.',
            type: 'SUMMARY'
          },
          {
            id: 'sec-stability',
            title: 'Stability Baselines',
            content: 'Comparison metrics showing version-over-version score deltas.',
            type: 'STABILITY_METRICS'
          }
        );
        break;

      case 'PREDICTIVE_INTEL':
        sections.push(
          {
            id: 'sec-predictive',
            title: 'Simulation Forecaster Insights',
            content: 'Algorithmic projections detailing drop-off zones and exit thresholds.',
            type: 'PREDICTIVE_HIGHLIGHTS'
          }
        );
        break;

      case 'PERSONA_ANALYSIS':
        sections.push(
          {
            id: 'sec-persona',
            title: 'Persona Friction Distribution',
            content: 'Detailed mapping showing success and failure indicators per user archetype.',
            type: 'PERSONA_IMPACT'
          }
        );
        break;

      default:
        sections.push({
          id: 'sec-default',
          title: 'General UX Audit Report',
          content: 'Consolidated report documenting workflow metrics and findings.',
          type: 'SUMMARY'
        });
    }

    return {
      sections,
      accentColor
    };
  }
}
