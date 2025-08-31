// utils.ts - Utility functions

import type { DataType } from './types';

/**
 * Get the type of a value
 */
export const typeOf = (v: any): DataType => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'object') return 'object';
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'undefined') return t as DataType;
  return 'object';
};

/**
 * Create a preview string for a value
 */
export const previewStr = (v: any): string => {
  const t = typeOf(v);
  if (t === 'string') return v as string;
  if (t === 'number' || t === 'boolean') return String(v);
  if (t === 'undefined') return 'undefined';
  if (t === 'null') return 'null';
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 77) + '…' : s;
  } catch {
    return String(v);
  }
};

/**
 * Escape HTML characters
 */
export const escapeHtml = (s: string) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Get value from object using dot notation path
 */
export const getValueFromPath = (obj: any, path: string) => {
  try {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  } catch {
    return undefined;
  }
};

/**
 * Set component text content
 */
export const setComponentText = (comp: any, text: string) => {
  const children = comp.components?.();
  if (children && children.length) {
    // if a single textnode exists, update it
    const first = children.at(0);
    if (first && first.is && first.is('textnode')) {
      first.set('content', text);
      return;
    }
  }
  // otherwise reset to a single text node
  comp.components().reset([{ type: 'textnode', content: text }]);
};
