import { ExecutiveReport } from '@fricta/db';
import { PresentationDeck, SlideData } from '../types';

export class PresentationDeckBuilder {
  /**
   * Generates a boardroom-ready presentation deck outline from an Executive Report.
   */
  static generatePresentation(report: ExecutiveReport & { sections: any }): PresentationDeck {
    const slides: SlideData[] = [
      {
        id: 'slide-title',
        title: report.title,
        elements: [
          {
            type: 'TEXT',
            content: 'UX Usability & Intelligence Executive Review Deck'
          },
          {
            type: 'TEXT',
            content: `Stability Rating: ${report.stabilityScore}/100 | Risk Factor: ${report.riskLevel}`
          }
        ]
      }
    ];

    // Convert report sections to individual slides
    const parsedSections = typeof report.sections === 'string' ? JSON.parse(report.sections) : report.sections;
    if (Array.isArray(parsedSections)) {
      parsedSections.forEach((section: any, idx: number) => {
        const slide: SlideData = {
          id: `slide-section-${idx}`,
          title: section.title,
          elements: [
            {
              type: 'TEXT',
              content: section.content
            }
          ]
        };

        if (section.metadata) {
          slide.elements.push({
            type: 'METRICS_GRID',
            content: section.metadata
          });
        }

        slides.push(slide);
      });
    }

    return {
      deckTitle: report.title,
      theme: report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH' ? 'DARK_ALERT' : 'DARK_STABLE',
      slides
    };
  }
}
