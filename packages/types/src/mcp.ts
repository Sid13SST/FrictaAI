export interface MCPElement {
  text: string;
  role: string;
  visible: boolean;
  disabled: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  interactionType?: string;
}

export interface MCPPageContext {
  url: string;
  title: string;
  buttons: MCPElement[];
  inputs: MCPElement[];
  links: MCPElement[];
  headings: MCPElement[];
  texts: MCPElement[];
}

export interface MCPMemoryState {
  visitedPages: string[];
}

export interface MCPInteractionEvent {
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'goBack' | 'retry' | 'error';
  target: string;
  timestamp: number;
  url: string;
  metadata?: Record<string, any>;
}

export interface MCPContext {
  sessionId: string;
  currentPage: MCPPageContext;
  history: MCPInteractionEvent[];
  memory: MCPMemoryState;
}
