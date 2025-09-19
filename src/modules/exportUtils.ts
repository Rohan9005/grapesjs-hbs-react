// exportUtils.ts - Export and preview utilities

import Handlebars from 'handlebars';
import { htmlToHbs } from './handlebarsAdapter';

/**
 * Export HBS template
 */
export const exportHbs = (
  editor: any,
  onChange?: (hbs: string) => void
): string => {
  const html = editor?.getHtml() || '';
  const css = editor?.getCss() || '';
  const merged = css ? `<style>${css}</style>${html}` : html;
  const hbs = htmlToHbs(merged);

  // Call the callback
  onChange?.(hbs);

  // Return the HBS so caller can use it
  return hbs;
};
