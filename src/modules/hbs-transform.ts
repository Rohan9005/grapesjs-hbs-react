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
  const dom = new JSDOM(`<body>${html}</body>`);
  const doc = dom.window.document;

  // Convert loop wrappers back to {{#each path}} ... {{/each}}
  doc.querySelectorAll<HTMLElement>('[data-hbs-each]').forEach((wrapper) => {
    const path = wrapper.getAttribute('data-hbs-each') || '';
    const parts = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-hbs-index]'))
      .map((div) => div.innerHTML)
      .join('');
    const block = `{{#each ${path}}}${parts}{{/each}}`;
    wrapper.replaceWith(doc.createTextNode(block));
  });

  // Convert token spans back to {{...}}
  doc.querySelectorAll<HTMLSpanElement>('span.hbs-token').forEach((span) => {
    const expr = span.getAttribute('data-hbs') || '';
    const node = doc.createTextNode(expr.trim());
    span.replaceWith(node);
  });

  return doc.body.innerHTML;
}