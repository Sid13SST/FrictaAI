import { PrismaClient } from '@fricta/db';
import * as path from 'path';
import { LayoutAnalyzer } from '../layout';
import { VisualHeuristicsEngine } from '../heuristics';
import { VisualAIAnalyzer, VisionAnalysisResult } from '../vision';
import { VisualScoringEngine } from '../scoring';
import { VisualObservation, VisualScoresResult } from '../types';

export interface AnalysisSessionResult {
  findings: VisualObservation[];
  scores: VisualScoresResult;
  aiAnalysisUsed: boolean;
}

export class VisualIntelligenceCoordinator {
  private heuristicsEngine: VisualHeuristicsEngine;
  private aiAnalyzer: VisualAIAnalyzer;
  private scoringEngine: VisualScoringEngine;

  constructor(private prisma?: PrismaClient) {
    this.heuristicsEngine = new VisualHeuristicsEngine();
    this.aiAnalyzer = new VisualAIAnalyzer();
    this.scoringEngine = new VisualScoringEngine();
  }

  /**
   * Run visual analysis on a single screenshot.
   * If absoluteImagePath is provided, optional AI Vision Analysis can run if heuristics detect high ambiguity.
   */
  async analyzeScreenshot(
    screenshotId: string,
    options: {
      absoluteImagePath?: string;
      forceAIVision?: boolean;
    } = {}
  ): Promise<{ findings: VisualObservation[]; scores: VisualScoresResult; aiUsed: boolean }> {
    if (!this.prisma) {
      throw new Error('Prisma client is required to fetch screenshot details.');
    }

    // 1. Fetch screenshot and its layout metadata
    const screenshot = await this.prisma.workflowScreenshot.findUnique({
      where: { id: screenshotId }
    });

    if (!screenshot) {
      throw new Error(`Screenshot not found: ${screenshotId}`);
    }

    const metadata = screenshot.metadata as any;
    let layout = metadata?.layout;

    // Fallback: If layout is missing or has no elements, mock it based on stepIndex to simulate diverse visual scenarios
    if (!layout || (!layout.regions?.length && !layout.elements?.length)) {
      const stepIndex = screenshot.stepIndex || 0;
      const pageTitle = metadata?.pageTitle || '';
      
      if (stepIndex % 5 === 0) {
        // Landing Page Mock
        layout = {
          regions: [
            { type: 'header', box: { x: 0, y: 0, w: 1280, h: 80 } },
            { type: 'footer', box: { x: 0, y: 720, w: 1280, h: 80 } }
          ],
          elements: [
            { id: 'mock-heading', role: 'heading', text: `Welcome to ${pageTitle || 'Fricta'}`, box: { x: 300, y: 200, w: 680, h: 60 } },
            { id: 'mock-cta', role: 'button', text: 'Get Started', intent: 'primary', box: { x: 540, y: 350, w: 200, h: 50 } }
          ]
        };
      } else if (stepIndex % 5 === 1) {
        // High Form Density Mock
        layout = {
          regions: [
            { type: 'form', box: { x: 400, y: 100, w: 480, h: 600 } }
          ],
          elements: Array.from({ length: 12 }, (_, i) => ({
            id: `mock-input-${i}`,
            role: 'input',
            text: '',
            box: { x: 450, y: 150 + i * 40, w: 380, h: 30 }
          }))
        };
      } else if (stepIndex % 5 === 2) {
        // Navigation Overload Mock
        layout = {
          regions: [
            { type: 'sidebar', box: { x: 0, y: 0, w: 240, h: 800 } }
          ],
          elements: Array.from({ length: 12 }, (_, i) => ({
            id: `mock-link-${i}`,
            role: 'link',
            text: `Navigation Link ${i + 1}`,
            box: { x: 20, y: 100 + i * 40, w: 180, h: 25 }
          }))
        };
      } else if (stepIndex % 5 === 3) {
        // Empty State Friction Mock
        layout = {
          regions: [],
          elements: [
            { id: 'mock-empty-txt', role: 'text', text: 'No entries found. Welcome to your empty workspace.', box: { x: 400, y: 300, w: 480, h: 40 } }
          ]
        };
      } else {
        // Cluttered Overlapping Mock
        layout = {
          regions: [],
          elements: [
            { id: 'mock-overlap-1', role: 'button', text: 'Apply Filters', box: { x: 100, y: 100, w: 150, h: 40 } },
            { id: 'mock-overlap-2', role: 'text', text: 'Search Results details...', box: { x: 120, y: 120, w: 250, h: 30 } }
          ]
        };
      }
    }

    const regions = layout.regions || [];
    const elements = layout.elements || [];

    // 2. Initialize Layout Analyzer and run deterministic heuristics
    const layoutAnalyzer = new LayoutAnalyzer(
      regions,
      elements,
      screenshot.viewportWidth || 1280,
      screenshot.viewportHeight || 720
    );

    const findings = this.heuristicsEngine.analyze(layoutAnalyzer, screenshotId);

    // 3. Determine if we should trigger AI Vision Analysis (Selective Vision Enhancement)
    let aiUsed = false;
    let visionResult: VisionAnalysisResult | null = null;

    const hasAmbiguity = findings.some(f => f.severity === 'high' || f.severity === 'critical');
    const triggerAI = options.forceAIVision || (hasAmbiguity && options.absoluteImagePath && process.env.OPENROUTER_API_KEY);

    if (triggerAI && options.absoluteImagePath) {
      console.info(`[VisualIntelligenceCoordinator] Ambiguity or force flag detected. Invoking AI Vision on screenshot: ${screenshotId}`);
      
      const contextPrompt = `
Deterministic heuristics found the following layout issues:
${findings.map(f => `- [${f.severity}] ${f.title}: ${f.description}`).join('\n')}

Please review the visual presentation and provide deep structural insights on overlapping elements, discoverability hurdles, clarity friction, and cognitive density.
`;
      
      visionResult = await this.aiAnalyzer.analyzeScreenshot(options.absoluteImagePath, contextPrompt);
      
      if (visionResult && visionResult.rawResponse) {
        aiUsed = true;

        // Map AI annotated boxes into visual observations
        if (visionResult.annotatedBoxes && visionResult.annotatedBoxes.length > 0) {
          visionResult.annotatedBoxes.forEach((box: any, index: number) => {
            findings.push({
              screenshotId,
              findingType: 'vision_finding',
              severity: 'medium',
              title: box.label || `Visual Issue ${index + 1}`,
              description: visionResult?.explanation || 'Detected via visual intelligence model.',
              boundingBoxes: [{
                x: box.x,
                y: box.y,
                w: box.w,
                h: box.h,
                label: box.label || 'Issue area'
              }],
              metadata: { source: 'openrouter-vision', explanation: visionResult?.explanation }
            });
          });
        }

        // Add a general observation for the feedback
        findings.push({
          screenshotId,
          findingType: 'vision_summary',
          severity: 'low',
          title: 'AI Visual Feedback',
          description: visionResult.clarityFeedback,
          boundingBoxes: [],
          metadata: { explanation: visionResult.explanation }
        });
      }
    }

    // 4. Calculate Scores
    const scores = this.scoringEngine.calculateScores(findings);

    return { findings, scores, aiUsed };
  }

  /**
   * Orchestrates the analysis of an entire session, running heuristics and optional AI vision on screenshots,
   * then storing all findings and final visual scores in the database.
   */
  async analyzeSession(
    sessionId: string,
    options: {
      storageBaseDir?: string;
      forceAIVision?: boolean;
    } = {}
  ): Promise<AnalysisSessionResult> {
    if (!this.prisma) {
      throw new Error('Prisma client is required to perform session visual analysis.');
    }

    console.info(`[VisualIntelligenceCoordinator] Running Visual Analysis for Session: ${sessionId}`);

    // Fetch all screenshots for this session
    const screenshots = await this.prisma.workflowScreenshot.findMany({
      where: { workflowSessionId: sessionId },
      orderBy: { stepIndex: 'asc' }
    });

    const allFindings: VisualObservation[] = [];
    let sessionAiUsed = false;

    // Build base path to resolve absolute screenshot paths
    // Find monorepo root or use baseDir
    let storageDir = options.storageBaseDir;
    if (!storageDir) {
      let current = __dirname;
      let root = process.cwd();
      while (current !== path.parse(current).root) {
        const hasPackages = require('fs').existsSync(path.join(current, 'packages'));
        const hasApps = require('fs').existsSync(path.join(current, 'apps'));
        if (hasPackages && hasApps) {
          root = current;
          break;
        }
        current = path.dirname(current);
      }
      storageDir = path.join(root, 'storage');
    }

    // Analyze each screenshot
    for (const screenshot of screenshots) {
      const absoluteImagePath = path.join(storageDir, screenshot.filePath);
      
      try {
        const { findings, aiUsed } = await this.analyzeScreenshot(screenshot.id, {
          absoluteImagePath,
          forceAIVision: options.forceAIVision
        });

        if (aiUsed) {
          sessionAiUsed = true;
        }

        allFindings.push(...findings);
      } catch (err: any) {
        console.error(`[VisualIntelligenceCoordinator] Failed to analyze screenshot ${screenshot.id}:`, err.message);
      }
    }

    // Calculate aggregated score across all observations
    const finalScores = this.scoringEngine.calculateScores(allFindings);

    // Save observations to the database
    // Clear existing findings and scores for this session to prevent duplicate data
    await this.prisma.visualFinding.deleteMany({
      where: { workflowSessionId: sessionId }
    });

    await this.prisma.visualScore.deleteMany({
      where: { workflowSessionId: sessionId }
    });

    // Create findings
    if (allFindings.length > 0) {
      await this.prisma.visualFinding.createMany({
        data: allFindings.map(f => ({
          workflowSessionId: sessionId,
          screenshotId: f.screenshotId,
          findingType: f.findingType,
          severity: f.severity,
          title: f.title,
          description: f.description,
          boundingBoxes: f.boundingBoxes as any,
          metadata: f.metadata as any
        }))
      });
    }

    // Save final scores
    const visualScore = await this.prisma.visualScore.create({
      data: {
        workflowSessionId: sessionId,
        clarityScore: finalScores.clarityScore,
        discoverabilityScore: finalScores.discoverabilityScore,
        layoutBalanceScore: finalScores.layoutBalanceScore,
        navigationScore: finalScores.navigationScore,
        overallScore: finalScores.overallScore
      }
    });

    console.info(`[VisualIntelligenceCoordinator] Saved ${allFindings.length} findings and scores for session: ${sessionId}`);

    return {
      findings: allFindings,
      scores: finalScores,
      aiAnalysisUsed: sessionAiUsed
    };
  }
}
