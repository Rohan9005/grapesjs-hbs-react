// Template extraction utilities for each blocks
import { cleanHandlebarsExpression } from './utils';

/**
 * Extracts the template from each block content
 */
export function extractTemplateFromEachContent(content: string): string {
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

/**
 * Extracts a complete element from a line
 */
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

/**
 * Extracts the first item by pattern detection
 */
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
