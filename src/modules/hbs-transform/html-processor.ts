// Main HTML processing functionality
import { findEachBlocks } from './html-parser';
import { extractTemplateFromEachContent } from './template-extractor';
import { convertSpansToMustacheInContent } from './span-converter';
import { cleanHandlebarsExpression, convertNumericPathToThis } from './utils';

/**
 * Processes HTML using regex for each blocks and DOM for remaining spans
 */
export function processHtmlWithRegexAndDom(html: string): string {
  let result = html;
  
  // Process each blocks using a more robust approach
  const eachBlockMatches = findEachBlocks(result);
  
  for (const eachBlock of eachBlockMatches) {
    const { fullMatch, path, content } = eachBlock;
    
    // Convert spans to mustache expressions
    const wrapperContent = convertSpansToMustacheInContent(content, path);
    
    // Extract template from content
    const template = extractTemplateFromEachContent(wrapperContent);
    
    // Replace with Handlebars each block
    const block = ` {{#each ${path}}} ${template} {{/each}} `;
    result = result.replace(fullMatch, block);
  }
  
  // Process remaining token spans using regex to avoid JSDOM parsing issues with Handlebars
  result = result.replace(/<span[^>]*data-hbs="([^"]+)"[^>]*class="hbs-token"[^>]*>[^<]*<\/span>/g, (spanMatch, expr) => {
    const cleanExpr = cleanHandlebarsExpression(expr);
    const finalExpr = convertNumericPathToThis(cleanExpr);
    return `{{${finalExpr}}}`;
  });
  
  return result;
}
