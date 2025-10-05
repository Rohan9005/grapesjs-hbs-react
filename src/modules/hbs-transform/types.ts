// Type definitions for hbs-transform functionality

export interface TokenSpan {
  expression: string;
  value: string;
  className: string;
}

export interface EachBlock {
  path: string;
  range: string;
  content: string;
}

export interface EachBlockMatch {
  fullMatch: string;
  path: string;
  content: string;
}

export interface TagContent {
  content: string;
  length: number;
}
