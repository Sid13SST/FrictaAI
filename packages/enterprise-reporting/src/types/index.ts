export interface ExecutiveReportSection {
  id: string;
  title: string;
  content: string;
  type: 'SUMMARY' | 'RISK_OVERVIEW' | 'STABILITY_METRICS' | 'PERSONA_IMPACT' | 'PREDICTIVE_HIGHLIGHTS' | 'EVIDENCE_GALLERY';
  metadata?: any;
}

export interface ReportLayoutStructure {
  sections: ExecutiveReportSection[];
  headerImage?: string;
  accentColor?: string;
}

export interface SlideElement {
  type: 'TEXT' | 'BULLET_LIST' | 'EVIDENCE_URL' | 'RISK_BADGE' | 'METRICS_GRID';
  content: string | string[] | any;
  styles?: any;
}

export interface SlideData {
  id: string;
  title: string;
  elements: SlideElement[];
}

export interface PresentationDeck {
  deckTitle: string;
  theme: string;
  slides: SlideData[];
}

export interface PDFLayoutPage {
  pageNumber: number;
  header: string;
  footer: string;
  elements: any[];
}

export interface PDFLayoutStructure {
  documentTitle: string;
  totalPages: number;
  pages: PDFLayoutPage[];
}
