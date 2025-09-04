// exportUtils.ts - Export and preview utilities

import Handlebars from 'handlebars';
import { htmlToHbs } from './handlebarsAdapter';

/**
 * Export HBS template
 */
export const exportHbs = (editor: any, onChange?: (hbs: string) => void) => {
  const html = editor?.getHtml() || '';
  const css = editor?.getCss() || '';
  const merged = css ? `<style>${css}</style>${html}` : html;
  const hbs = htmlToHbs(merged);
  onChange?.(hbs);
};
