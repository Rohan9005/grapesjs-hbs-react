// handlebarsAdapter.ts - Handlebars <-> HTML conversion

import Handlebars from 'handlebars';
import { PLACE_TAG, HBS_ATTR } from './types';

/**
 * Convert Handlebars template to HTML with token placeholders
 * This version preserves {{#each}} and {{#if}} blocks while converting simple variables to tokens
 */
export const hbsToHtml = (hbs: string, sampleData: any) => {
  const hb = Handlebars.create();

  // fallback for variables
  hb.registerHelper("lookupVar", function (path: string, options: any) {
    const parts = path.split(".");
    let value: any = options.data.root;
    for (const p of parts) {
      value = value?.[p];
    }
    const safeVal = value == null ? "" : value;
    return new hb.SafeString(
      `<${PLACE_TAG} ${HBS_ATTR}="{{${path}}}" class="hbs-token">${safeVal}</${PLACE_TAG}>`
    );
  });

  // ---- Protect blocks
  const protectedBlocks: string[] = [];
  let blockCounter = 0;

  // Protect each blocks
  hbs = hbs.replace(/({{#each\s+[^}]+}}[\s\S]*?{{\/each}})/g, (match) => {
    const placeholder = `__PROTECTED_BLOCK_${blockCounter}__`;
    protectedBlocks[blockCounter] = match;
    blockCounter++;
    return placeholder;
  });

  // Protect if blocks
  hbs = hbs.replace(/({{#if\s+[^}]+}}[\s\S]*?{{\/if}})/g, (match) => {
    const placeholder = `__PROTECTED_BLOCK_${blockCounter}__`;
    protectedBlocks[blockCounter] = match;
    blockCounter++;
    return placeholder;
  });

  // Rewrite variables
  const rewritten = hbs.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, expr) => {
    return `{{lookupVar "${expr}"}}`;
  });

  // Restore protected blocks
  let result = rewritten;
  protectedBlocks.forEach((block, index) => {
    result = result.replace(`__PROTECTED_BLOCK_${index}__`, block);
  });

  result = result.replace(
    /{{#each\s+([a-zA-Z0-9_.]+)}}([\s\S]*?){{\/each}}/g,
    (_, arrayName, inner) => {
      const arr = sampleData[arrayName] || [];
      let renderedItems = "";

      let start = 0, end = arr.length - 1;
      // If range metadata exists (data-hbs-range="0-2" or "all"), slice accordingly

      arr.slice(start, end + 1).forEach((item: any, idx: number) => {
        const tpl = hb.compile(inner);
        const renderedInner = tpl(item);
        renderedItems += `<div data-hbs-index="${idx}">${renderedInner}</div>`;
      });

      return `<div data-hbs-each="${arrayName}" data-hbs-range="${start}-${end}">${renderedItems}</div>`;
    }
  );


  const template = hb.compile(result);
  return template(sampleData);
};

/**
 * Convert HTML with token placeholders back to Handlebars
 */
export const htmlToHbs = (html: string) => {
  const container = document.createElement("div");
  container.innerHTML = html;

  // Handle token placeholders
  container.querySelectorAll(`[${HBS_ATTR}]`).forEach((el) => {
    const hbsExpr = el.getAttribute(HBS_ATTR) || "";
    if (!hbsExpr) return;

    let inner = el.innerHTML;

    el.removeAttribute("data-hbs-processed");
    el.removeAttribute("data-source");
    el.removeAttribute("class");

    if (hbsExpr.startsWith("{{#if") || hbsExpr.startsWith("{{#each")) {
      el.outerHTML = `${hbsExpr}${inner}{{/${hbsExpr.split(" ")[0].replace("{{#", "")}}}`;
    } else {
      el.outerHTML = hbsExpr;
    }
  });

  container.querySelectorAll("[data-hbs-each]").forEach((wrapper) => {
    const arrayName = wrapper.getAttribute("data-hbs-each");
    const hbsExpr = wrapper.getAttribute(HBS_ATTR) || `{{#each ${arrayName}}}`;
    const closing = wrapper.getAttribute("data-hbs-closing") || "{{/each}}";
    if (!arrayName) return;
  
    const children = wrapper.querySelectorAll("[data-hbs-index]");
    let block = hbsExpr;
  
    children.forEach((child) => {
      block += child.innerHTML;
    });
    block += closing;
  
    wrapper.outerHTML = block;
  });  


  return container.innerHTML;
};

/**
 * Compile path preview for modal
 */
export const compilePathPreview = (path: string, ctx: any) => {
  try {
    const tpl = Handlebars.compile(`{{${path}}}`);
    return tpl(ctx);
  } catch {
    return '';
  }
};
