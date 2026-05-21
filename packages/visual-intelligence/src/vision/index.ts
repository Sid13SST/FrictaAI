import * as fs from 'fs/promises';
import * as path from 'path';

export interface VisionAnalysisOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
}

export interface VisionAnalysisResult {
  rawResponse: string;
  annotatedBoxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
  }>;
  explanation: string;
  clarityFeedback: string;
}

const DEFAULT_MODEL = 'google/gemini-flash-1.5';
const DEFAULT_MAX_TOKENS = 500;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class VisualAIAnalyzer {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private baseUrl: string;

  constructor(options: VisionAnalysisOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = options.model || DEFAULT_MODEL;
    this.temperature = options.temperature ?? 0.2; // Low temperature for structured analysis
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.baseUrl = options.baseUrl || OPENROUTER_BASE_URL;
  }

  /**
   * Analyzes a screenshot using a multimodal vision model.
   * Only triggered selectively when deterministic heuristics signal ambiguity, high complexity,
   * or when specific context needs interpretation.
   */
  async analyzeScreenshot(
    imagePath: string,
    contextPrompt: string
  ): Promise<VisionAnalysisResult> {
    if (!this.apiKey) {
      console.warn('[VisualAIAnalyzer] OPENROUTER_API_KEY is not set. Visual AI analysis skipped.');
      return {
        rawResponse: '',
        annotatedBoxes: [],
        explanation: 'AI Vision analysis was skipped because OPENROUTER_API_KEY is not set.',
        clarityFeedback: 'Heuristics-only fallback mode.'
      };
    }

    try {
      const buffer = await fs.readFile(imagePath);
      const base64Image = buffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/webp';

      const prompt = `
You are Fricta's Visual UX Expert.
Analyze this web application screenshot and address the following UX concerns:
${contextPrompt}

Provide your response in raw JSON format inside a JSON code block:
\`\`\`json
{
  "explanation": "Detailed visual analysis explanation focusing on user flow, readability, CTA prominence, empty state guidance, and navigation clutter.",
  "clarityFeedback": "Specific feedback on visual clarity and layout quality.",
  "annotatedBoxes": [
    {
      "x": 100,
      "y": 150,
      "w": 80,
      "h": 40,
      "label": "Brief description of the problematic element/area"
    }
  ]
}
\`\`\`
Note: All coordinates in "annotatedBoxes" must represent bounding box percentages or pixels relative to the screenshot's dimensions (assume standard viewport 1280x720 if unsure). If there are no issues or specific elements to point out, return an empty array for "annotatedBoxes".
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://fricta.ai',
          'X-Title': 'Fricta AI UX Visual Intelligence',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'low' // Optimize token usage & cost
                  }
                }
              ]
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as any;
      const content = data?.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('OpenRouter returned an empty response');
      }

      // Try parsing JSON block
      let parsed: any;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
        const jsonStr = jsonMatch[1].trim();
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('[VisualAIAnalyzer] Failed to parse JSON from vision model, attempting cleanup.');
        // Clean up markdown markers if any and try parsing directly
        const cleanContent = content.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(cleanContent);
      }

      return {
        rawResponse: content,
        annotatedBoxes: parsed.annotatedBoxes || [],
        explanation: parsed.explanation || 'No explanation provided.',
        clarityFeedback: parsed.clarityFeedback || 'No clarity feedback provided.'
      };

    } catch (error: any) {
      console.error('[VisualAIAnalyzer] Vision analysis failed:', error.message);
      return {
        rawResponse: '',
        annotatedBoxes: [],
        explanation: `Vision analysis failed: ${error.message}`,
        clarityFeedback: 'Fell back to layout heuristics due to vision call failure.'
      };
    }
  }
}
