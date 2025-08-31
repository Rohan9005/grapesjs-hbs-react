// types.ts - Shared types and interfaces

export type TemplateEditorProps = {
  initialHbs?: string;          // load an existing .hbs
  sampleData?: any;             // for preview/rendering
  variables?: string[];         // optional list for future use
  onExport?: (hbs: string) => void;
  dataSources?: Record<string, any>; // keys rendered as cards in modal
};

export type DataType = 'null' | 'array' | 'object' | 'string' | 'number' | 'boolean' | 'undefined';

export type ExplorerModalMode = 'variable' | 'each' | 'if';

export type ExplorerModalContext = {
  preview: string;
  selectedKind: string;
  range?: { from?: number; to?: number };
};

export type ExplorerModalOptions = {
  editor: any;
  root: any;
  startPath?: string;
  mode: ExplorerModalMode;
  onConfirm: (chosenPath: string, context: ExplorerModalContext) => void;
};

export type DataEntry = {
  label: string;
  path: string;
  value: any;
  kind: DataType;
};

// Constants
export const PLACE_TAG = 'span';
export const HBS_ATTR = 'data-hbs';
