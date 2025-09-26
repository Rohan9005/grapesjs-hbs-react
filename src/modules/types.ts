// types.ts - Shared types and interfaces
import { Editor } from "grapesjs";

export interface TemplateEditorProps {
  initialHbs?: string;
  onChange?: (hbs: string) => void;
  dataSources?: Record<string, any>;
}

export type DataType = 'null' | 'array' | 'object' | 'string' | 'number' | 'boolean' | 'undefined';

export type ExplorerModalMode = 'variable' | 'each' | 'if';

export type ExplorerModalContext = {
  preview: string;
  selectedKind: string;
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
