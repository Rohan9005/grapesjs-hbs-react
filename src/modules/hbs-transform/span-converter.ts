// Span to mustache conversion utilities
import { cleanHandlebarsExpression } from './utils';

/**
 * Converts spans to mustache expressions within each block content
 */
export function convertSpansToMustacheInContent(content: string, path: string): string {
  // Convert spans with data-hbs attributes (handle both attribute orders)
  let converted = content.replace(/<span[^>]*data-hbs="([^"]+)"[^>]*class="hbs-token"[^>]*>[^<]*<\/span>|<span[^>]*class="hbs-token"[^>]*data-hbs="([^"]+)"[^>]*>[^<]*<\/span>/g, (spanMatch, expr1, expr2) => {
    const expr = expr1 || expr2;
    const cleanExpr = cleanHandlebarsExpression(expr);
    
    // Convert absolute paths like "items.0.name" to relative paths like "name"
    const arrayIndexPattern = new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+\\.(.+)$`);
    const arrayIndexMatch = cleanExpr.match(arrayIndexPattern);
    if (arrayIndexMatch) {
      return `{{${arrayIndexMatch[1]}}}`;
    }
    
    // Handle simple array case - convert "simpleArray.0" to "this"
    const simpleArrayPattern = new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+$`);
    if (simpleArrayPattern.test(cleanExpr)) {
      return '{{this}}';
    }
    
    return `{{${cleanExpr}}}`;
  });
  
  // Handle spans without data-hbs attributes (for simple arrays)
  converted = converted.replace(/<span class="hbs-token">([^<]*)<\/span>/g, () => {
    return '{{this}}';
  });
  
  return converted;
}
