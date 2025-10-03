// handlebarsAdapter.ts - Handlebars <-> HTML conversion

import Handlebars from 'handlebars';
import { PLACE_TAG, HBS_ATTR } from './types';

/**
 * Convert Handlebars template to HTML with token placeholders
 * This version preserves {{#each}} and {{#if}} blocks while converting simple variables to tokens
 */
export const hbsToHtml = (hbs: string, sampleData: any) => {
  // clone a fresh instance so we don't double-register helpers
  const hb = Handlebars.create();

  // register a fallback helper for any unknown variable
  hb.registerHelper("lookupVar", function (path: string, options: any) {
    // resolve deep path manually
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

  // First, protect {{#each}} and {{#if}} blocks by temporarily replacing them
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

  // transform raw variables like {{company.name}} into {{lookupVar "company.name"}}
  // but only if they're not inside protected blocks
  const rewritten = hbs.replace(
    /{{\s*([a-zA-Z0-9_.]+)\s*}}/g,
    (_, expr) => `{{lookupVar "${expr}"}}`
  );

  // Restore protected blocks
  let result = rewritten;
  protectedBlocks.forEach((block, index) => {
    result = result.replace(`__PROTECTED_BLOCK_${index}__`, block);
  });

  const template = hb.compile(result);
  return template(sampleData);
};

/**
 * Convert HTML with token placeholders back to Handlebars
 */
export const htmlToHbs = (html: string) => {
  // --- Protect void/self-closing tags BEFORE DOM parsing ---
  const voidTags = ["br", "img", "hr", "input", "meta", "link"];
  const placeholders: string[] = [];

  voidTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}([^>]*)\\/?>`, "gi");
    html = html.replace(regex, (match) => {
      const placeholder = `__VOID_PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(match); // keep original <br/> or <img ... />
      return placeholder;
    });
  });

  const container = document.createElement("div");
  container.innerHTML = html;

  container.querySelectorAll(`[${HBS_ATTR}]`).forEach((el) => {
    const hbsExpr = el.getAttribute(HBS_ATTR) || "";
    if (!hbsExpr) return;

    // --- clean copy of innerHTML
    let inner = el.innerHTML;

    // Strip GrapesJS helper attributes
    el.removeAttribute("data-hbs-processed");
    el.removeAttribute("data-source");
    el.removeAttribute("class");

    // Replace element itself with its raw Handlebars code
    if (hbsExpr.startsWith("{{#if") || hbsExpr.startsWith("{{#each")) {
      el.outerHTML = `${hbsExpr}${inner}{{/${hbsExpr.split(" ")[0].replace("{{#", "")}}}`;
    } else {
      el.outerHTML = hbsExpr;
    }
  });

  let finalResult = container.innerHTML;

  placeholders.forEach((original, i) => {
    finalResult = finalResult.replace(`__VOID_PLACEHOLDER_${i}__`, original);
  });

  return finalResult;
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