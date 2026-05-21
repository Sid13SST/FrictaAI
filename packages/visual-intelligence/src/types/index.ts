export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutElement {
  id?: string;
  name?: string;
  role: 'button' | 'input' | 'link' | 'heading' | string;
  text: string;
  intent?: 'primary' | 'secondary' | 'destructive' | 'neutral' | string;
  box: BoundingBox;
}

export interface LayoutRegion {
  type: 'header' | 'footer' | 'main' | 'nav' | 'sidebar' | 'form' | string;
  box: BoundingBox;
}

export interface VisualObservation {
  screenshotId: string;
  findingType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  boundingBoxes: Array<{ x: number; y: number; w: number; h: number; label: string }>;
  metadata: any;
}

export interface VisualScoresResult {
  clarityScore: number;
  discoverabilityScore: number;
  layoutBalanceScore: number;
  navigationScore: number;
  overallScore: number;
}

export interface VisualFindingData {
  id?: string;
  workflowSessionId: string;
  screenshotId: string;
  findingType: string;
  severity: string;
  title: string;
  description: string;
  boundingBoxes: any; // Can be array of bounding boxes
  metadata?: any;
  timestamp?: Date;
}

