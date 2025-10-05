// Template processing functionality
import Handlebars from 'handlebars';
import { createContextProxy } from './context-proxy';
import { processHtmlWithRegexAndDom } from './html-processor';

/**
 * Transforms a Handlebars template to annotated HTML
 */
export function transformTemplateToAnnotatedHtml(template: string, data: unknown): string {
  const compiledTemplate = Handlebars.compile(template);
  const wrappedData = createContextProxy(data, '');
  return compiledTemplate(wrappedData);
}

/**
 * Transforms annotated HTML back to a Handlebars template
 */
export function transformAnnotatedHtmlToTemplate(html: string): string {
  // Use regex for each blocks to preserve HTML structure, then DOM for remaining spans
  return processHtmlWithRegexAndDom(html);
}
