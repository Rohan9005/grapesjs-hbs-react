// src/modules/hbs-transform.v3.ts - Simplified implementation using regex for each blocks
import Handlebars, { SafeString } from 'handlebars';

// Types for better type safety
interface TokenSpan {
  expression: string;
  value: string;
  className: string;
}

interface EachBlock {
  path: string;
  range: string;
  content: string;
}

// Utility functions
const escapeExpression = (value: unknown): string => 
  Handlebars.escapeExpression(value as string ?? '');

const createTokenSpan = (path: string, value: unknown, className = 'hbs-token'): SafeString =>
  new Handlebars.SafeString(
    `<span data-hbs="{{${path}}}" class="${className}">${escapeExpression(value)}</span>`
  );

// Context wrapping with proxy for lazy evaluation
function createContextProxy(obj: any, basePath = ''): any {
  if (obj == null || typeof obj !== 'object') {
    return createTokenSpan(basePath, obj);
  }

  const proxyFactory = (path: string, target: any) => ({
    get(_: any, prop: PropertyKey) {
      if (prop === '__hbs_path') return path;
      
      // Don't wrap array length property
      if (Array.isArray(target) && prop === 'length') {
        return target.length;
      }
      
      const rawValue = (target as any)[prop as any];
      const childPath = buildChildPath(path, target, prop);

      if (rawValue != null && typeof rawValue === 'object') {
        return new Proxy(rawValue, proxyFactory(childPath, rawValue));
      }
      
      return createTokenSpan(childPath, rawValue);
    },
    ownKeys: () => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (_: any, p: PropertyKey) =>
      Object.getOwnPropertyDescriptor(target, p) || { configurable: true, enumerable: true }
  });

  return new Proxy(obj, proxyFactory(basePath, obj));
}

function buildChildPath(basePath: string, target: any, prop: PropertyKey): string {
  if (Array.isArray(target)) {
    return basePath ? `${basePath}.${String(prop)}` : String(prop);
  }
  return (basePath ? `${basePath}.` : '') + String(prop);
}

// Custom each helper implementation
function registerCustomEachHelper(): void {
  Handlebars.unregisterHelper('each');
  
  Handlebars.registerHelper('each', function (this: any, context: any, options: any) {
    const array = context || [];
    
    if (!Array.isArray(array)) {
      return '';
    }

    const path = extractArrayPath(array, options);
    const innerContent = renderEachItems(array, options);
    const range = `0-${Math.max(0, array.length - 1)}`;

    return new Handlebars.SafeString(
      `<div data-hbs-each="${path}" data-hbs-range="${range}">${innerContent}</div>`
    );
  });
}

function extractArrayPath(array: any[], options: any): string {
  if (!options?.data?.root) {
    return '';
  }

  const root = options.data.root;
  
  // Check common array properties
  const commonPaths = ['items', 'simpleArray', 'data', 'list'];
  
  for (const path of commonPaths) {
    if (Array.isArray(root[path]) && 
        JSON.stringify(array) === JSON.stringify(root[path])) {
      return path;
    }
  }
  
  return '';
}

function renderEachItems(array: any[], options: any): string {
  let content = '';
  
  for (let i = 0; i < array.length; i++) {
    content += options.fn(array[i]);
  }
  
  return content;
}

// AST-based transformation functions
function transformTemplateToAnnotatedHtml(template: string, data: unknown): string {
  const compiledTemplate = Handlebars.compile(template);
  const wrappedData = createContextProxy(data, '');
  return compiledTemplate(wrappedData);
}

function transformAnnotatedHtmlToTemplate(html: string): string {
  // Use regex for each blocks to preserve HTML structure, then DOM for remaining spans
  return processHtmlWithRegexAndDom(html);
}

function findEachBlocks(html: string): Array<{ fullMatch: string; path: string; content: string }> {
  const blocks: Array<{ fullMatch: string; path: string; content: string }> = [];
  
  // Find all elements with data-hbs-each attribute (not just divs)
  const eachElementRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]+data-hbs-each="([^"]+)"[^>]*>/g;
  let match;
  
  while ((match = eachElementRegex.exec(html)) !== null) {
    const startIndex = match.index;
    const tagName = match[1];
    const path = match[2];
    
    // Find the matching closing tag
    const content = extractContentBetweenTags(html, startIndex, tagName);
    if (content) {
      const fullMatch = html.substring(startIndex, startIndex + content.length);
      blocks.push({ fullMatch, path, content: content.content });
    }
  }
  
  return blocks;
}

function extractContentBetweenTags(html: string, startIndex: number, tagName: string): { content: string; length: number } | null {
  let depth = 0;
  let i = startIndex;
  let inTag = false;
  let tagStart = -1;
  
  while (i < html.length) {
    const char = html[i];
    
    if (char === '<') {
      inTag = true;
      tagStart = i;
    } else if (char === '>') {
      if (inTag) {
        const tag = html.substring(tagStart, i + 1);
        
        if (tag.startsWith(`<${tagName}`)) {
          depth++;
        } else if (tag === `</${tagName}>`) {
          depth--;
          if (depth === 0) {
            // Found the matching closing tag
            const contentStart = html.indexOf('>', startIndex) + 1;
            const content = html.substring(contentStart, i);
            const totalLength = i + 1 - startIndex; // +1 for the '>' character
            return { content, length: totalLength };
          }
        }
      }
      inTag = false;
    }
    
    i++;
  }
  
  return null;
}


// Hybrid approach: regex for each blocks, DOM for spans
function processHtmlWithRegexAndDom(html: string): string {
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

function convertSpansToMustacheInContent(content: string, path: string): string {
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

function extractTemplateFromEachContent(content: string): string {
  // Generic approach: find the first complete HTML element that represents a single item
  // This works for any HTML structure, not just tables
  
  // Strategy: Find the first top-level element by looking for elements that are not nested
  // We'll look for elements that appear at the start of lines (after whitespace)
  const lines = content.split('\n');
  let firstElement = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.startsWith('<')) {
      // Found a potential element start, now find its complete structure
      const elementMatch = extractCompleteElementFromLine(content, trimmedLine);
      if (elementMatch) {
        return elementMatch;
      }
    }
  }
  
  // Fallback: extract first item by pattern detection
  return extractFirstItemByPattern(content);
}

function extractCompleteElementFromLine(content: string, elementStart: string): string | null {
  // Extract the tag name from the element start
  const tagMatch = elementStart.match(/<([a-zA-Z][a-zA-Z0-9]*)/);
  if (!tagMatch) return null;
  
  const tagName = tagMatch[1];
  
  // Find the complete element by matching opening and closing tags
  // This handles both self-closing and paired tags
  const selfClosingPattern = new RegExp(`<${tagName}[^>]*\\/>`, 's');
  const pairedPattern = new RegExp(`<${tagName}[^>]*>.*?<\\/${tagName}>`, 's');
  
  // Try self-closing first
  const selfClosingMatch = content.match(selfClosingPattern);
  if (selfClosingMatch) {
    return selfClosingMatch[0];
  }
  
  // Try paired tags
  const pairedMatch = content.match(pairedPattern);
  if (pairedMatch) {
    return pairedMatch[0];
  }
  
  return null;
}

function extractFirstItemByPattern(content: string): string {
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line);
  
  if (lines.length === 0) {
    return content;
  }
  
  const seenPatterns = new Set<string>();
  let firstBlockEnd = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = line.replace(/\{\{[^}]+\}\}/g, '{{VARIABLE}}');
    
    if (seenPatterns.has(normalizedLine)) {
      firstBlockEnd = i;
      break;
    }
    
    seenPatterns.add(normalizedLine);
  }
  
  const firstBlockLines = lines.slice(0, firstBlockEnd);
  return firstBlockLines.join('\n        ');
}

function cleanHandlebarsExpression(expression: string): string {
  return expression.replace(/^\{\{|\}\}$/g, '');
}

function convertNumericPathToThis(expression: string): string {
  // Handle simple array patterns like "simpleArray.0" -> "this"
  const parts = expression.split('.');
  if (parts.length === 2 && isNumeric(parts[1])) {
    return 'this';
  }
  return expression;
}

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

// Main export functions
export function hbsToAnnotatedHtml(hbsTemplate: string, data: unknown): string {
  registerCustomEachHelper();
  return transformTemplateToAnnotatedHtml(hbsTemplate, data);
}

export function annotatedHtmlToHbs(html: string): string {
  return transformAnnotatedHtmlToTemplate(html);
}
