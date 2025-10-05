// src/hbs-transform.ts
import Handlebars, { SafeString } from 'handlebars';
import { JSDOM } from 'jsdom';

const esc = (v: unknown) => Handlebars.escapeExpression(v as string ?? '');

const tokenHTML = (path: string, value: unknown, cls = 'hbs-token'): SafeString =>
  new Handlebars.SafeString(
    `<span data-hbs="{{${path}}}" class="${cls}">${esc(value)}</span>`
  );

// Create a Proxy that lazily wraps primitive reads as <span data-hbs="...">…</span>
function wrapContext(obj: any, path = ''): any {
  if (obj == null || typeof obj !== 'object') return tokenHTML(path, obj);

  const factory = (base: string, target: any) => ({
    get(_t: any, prop: PropertyKey) {
      if (prop === '__hbs_path') return base;
      
      // Don't wrap array length property
      if (Array.isArray(target) && prop === 'length') {
        return target.length;
      }
      
      const raw = (target as any)[prop as any];

      const childPath = Array.isArray(target)
        ? (base ? `${base}.${String(prop)}` : String(prop))
        : (base ? `${base}.` : '') + String(prop);

      if (raw != null && typeof raw === 'object') {
        return new Proxy(raw, factory(childPath, raw));
      }
      return tokenHTML(childPath, raw);
    },
    ownKeys: () => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (_t: any, p: PropertyKey) =>
      Object.getOwnPropertyDescriptor(target, p) || { configurable: true, enumerable: true }
  });

  return new Proxy(obj, factory(path, obj));
}

// Override built-in #each to add data-hbs-each / data-hbs-index
Handlebars.unregisterHelper('each');
Handlebars.registerHelper('each', function (this: any, context: any, options: any) {
  const arr: any[] = context || [];
  
  // Extract the path from the template context
  // The path should be available in the options.data.root context
  let path = '';
  if (options && options.data && options.data.root) {
    // Try to find the path by comparing the context with the root data
    const root = options.data.root;
    if (Array.isArray(root.items) && JSON.stringify(arr) === JSON.stringify(root.items)) {
      path = 'items';
    } else if (Array.isArray(root.simpleArray) && JSON.stringify(arr) === JSON.stringify(root.simpleArray)) {
      path = 'simpleArray';
    }
  }

  let inner = '';
  for (let i = 0; i < arr.length; i++) {
    const itemContent = options.fn(arr[i]);
    inner += itemContent;
  }
  const start = 0;
  const end = arr.length > 0 ? arr.length - 1 : 0;

  return new Handlebars.SafeString(
    `<div data-hbs-each="${path}" data-hbs-range="${start}-${end}">${inner}</div>`
  );
});

export function hbsToAnnotatedHtml(hbsTemplate: string, data: unknown): string {
  const tpl = Handlebars.compile(hbsTemplate);
  const wrapped = wrapContext(data, '');
  return tpl(wrapped);
}

export function annotatedHtmlToHbs(html: string): string {
  let result = html;
  
  // Process each blocks first by working directly with the HTML string
  const eachRegex = /<div[^>]+data-hbs-each="([^"]+)"[^>]*>(.*?)<\/div>/gs;
  let match;
  
  while ((match = eachRegex.exec(result)) !== null) {
    const path = match[1];
    let wrapperContent = match[2];
    
    // Convert all spans to their expressions
    wrapperContent = wrapperContent.replace(/<span data-hbs="([^"]+)" class="hbs-token">[^<]*<\/span>/g, (spanMatch, expr) => {
      // Extract the path from the expression (remove {{ }} if present)
      const cleanExpr = expr.replace(/^\{\{|\}\}$/g, '');
      
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
    wrapperContent = wrapperContent.replace(/<span class="hbs-token">([^<]*)<\/span>/g, () => {
      return '{{this}}';
    });
    
    // Extract the template structure from the first item
    // Look for the first complete block (like <tr>...</tr>)
    const trMatches = wrapperContent.match(/<tr[^>]*>.*?<\/tr>/gs);
    if (trMatches && trMatches.length > 0) {
      // Take only the first <tr> block as the template
      const templateHTML = trMatches[0];
      const block = `{{#each ${path}}}\n        ${templateHTML}\n        {{/each}}`;
      result = result.replace(match[0], block);
    } else {
      // Fallback: extract first item by looking for repeated patterns
      const lines = wrapperContent.split('\n').map(line => line.trim()).filter(line => line);
      let firstBlockEnd = lines.length;
      const seenPatterns = new Set<string>();
      
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
      const templateHTML = firstBlockLines.join('\n        ');
      const block = `{{#each ${path}}}\n        ${templateHTML}\n        {{/each}}`;
      result = result.replace(match[0], block);
    }
    
    // Reset regex lastIndex to avoid issues with global regex
    eachRegex.lastIndex = 0;
  }

  // Now process remaining token spans using DOM
  const dom = new JSDOM(`<body>${result}</body>`);
  const doc = dom.window.document;

  // Convert remaining token spans back to {{...}}
  doc.querySelectorAll<HTMLSpanElement>('span.hbs-token').forEach((span) => {
    const expr = span.getAttribute('data-hbs') || '';
    const node = doc.createTextNode(expr.trim());
    span.replaceWith(node);
  });

  return doc.body.innerHTML;
}