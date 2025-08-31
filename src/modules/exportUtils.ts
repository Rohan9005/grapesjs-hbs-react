// exportUtils.ts - Export and preview utilities

import Handlebars from 'handlebars';
import { htmlToHbs } from './handlebarsAdapter';

/**
 * Export HBS template
 */
export const exportHbs = (editor: any, onExport?: (hbs: string) => void) => {
  const html = editor?.getHtml() || '';
  const css = editor?.getCss() || '';
  const merged = css ? `<style>${css}</style>${html}` : html;
  const hbs = htmlToHbs(merged);
  onExport?.(hbs);
};

/**
 * Preview compiled template
 */
export const preview = (editor: any, sampleData: any) => {
  const html = editor?.getHtml() || '';
  const css = editor?.getCss() || '';
  const hbs = htmlToHbs(css ? `<style>${css}</style>${html}` : html);
  try {
    // Register a simple slice helper used on export when ranges are set
    Handlebars.registerHelper('slice', function (arr: any[], from: number, to?: number) {
      if (!Array.isArray(arr)) return [];
      if (typeof to === 'number') return arr.slice(from, to + 1);
      return arr.slice(from);
    });

    const tpl = Handlebars.compile(hbs);
    const compiled = tpl(sampleData);
    const w = window.open('', '_blank');
    if (w) w.document.write(compiled);
  } catch (e) {
    alert('Preview error: ' + (e as Error).message);
  }
};
