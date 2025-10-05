// Main hbs-transform module - exports all functionality
import { registerCustomEachHelper } from './each-helper';
import { transformTemplateToAnnotatedHtml, transformAnnotatedHtmlToTemplate } from './template-processor';

/**
 * Converts a Handlebars template to annotated HTML with data attributes
 */
export function hbsToAnnotatedHtml(hbsTemplate: string, data: unknown): string {
  registerCustomEachHelper();
  return transformTemplateToAnnotatedHtml(hbsTemplate, data);
}

/**
 * Converts annotated HTML back to a Handlebars template
 */
export function annotatedHtmlToHbs(html: string): string {
  return transformAnnotatedHtmlToTemplate(html);
}

// Re-export types for external use
export type { TokenSpan, EachBlock, EachBlockMatch, TagContent } from './types';

// Re-export utility functions for external use
export {
  escapeExpression,
  createTokenSpan,
  isNumeric,
  cleanHandlebarsExpression,
  convertNumericPathToThis
} from './utils';

// Re-export context proxy for external use
export { createContextProxy } from './context-proxy';

// Re-export each helper for external use
export { registerCustomEachHelper } from './each-helper';
