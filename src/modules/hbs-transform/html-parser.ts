// HTML parsing utilities for extracting each blocks and content
import { EachBlockMatch, TagContent } from './types';

/**
 * Finds all each blocks in HTML content
 */
export function findEachBlocks(html: string): EachBlockMatch[] {
  const blocks: EachBlockMatch[] = [];
  
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

/**
 * Extracts content between opening and closing tags
 */
export function extractContentBetweenTags(html: string, startIndex: number, tagName: string): TagContent | null {
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
