// editorSetup.ts - GrapesJS editor setup and configuration

import { PLACE_TAG, HBS_ATTR } from './types';
import { escapeHtml, setComponentText, getValueFromPath } from './utils';
import { openExplorerModal } from './dataExplorer';

/**
 * Setup HBS token component type
 */
export const setupHbsTokenComponent = (editor: any) => {
  // Component type for our token placeholder (locks accidental edits)
  editor.DomComponents.addType('hbs-token', {
    isComponent: (el: HTMLElement) => el.tagName === PLACE_TAG.toUpperCase() && el.hasAttribute(HBS_ATTR),
    model: {
      defaults: {
        tagName: PLACE_TAG,
        droppable: false,
        draggable: true,
        copyable: true,
        traits: [
          { label: 'Handlebars', name: HBS_ATTR, type: 'text', changeProp: true },
        ],
        attributes: { class: 'hbs-token' },
      },
    },
  });

  // Interpret our placeholders as the above type
  editor.Parser.getConfig().compTypes?.unshift({
    id: 'hbs-token',
    isComponent: (el: HTMLElement) =>
      el.tagName === PLACE_TAG.toUpperCase() && el.hasAttribute(HBS_ATTR),
    model: { type: 'hbs-token' },
  });
};

/**
 * Setup basic blocks
 */
export const setupBlocks = (editor: any) => {
  // Block Manager
  const blockManager = editor.BlockManager;

  // Section block
  blockManager.add("section", {
    label: "Section",
    category: "Basic",
    attributes: { class: "fa fa-square" },
    content: {
      type: "section",
      components: [
        {
          type: "text",
          content: "Section content here...",
        },
      ],
      style: {
        padding: "20px",
        border: "1px dashed #aaa",
        margin: "10px 0",
      },
    },
  });

  // H1 Block
  blockManager.add("h1-block", {
    label: "H1",
    category: "Basic",
    attributes: { class: "fa fa-header" },
    content: `<h1 style="font-size:2em; font-weight:bold;">Heading 1</h1>`,
  });

  // H2 Block
  blockManager.add("h2-block", {
    label: "H2",
    category: "Basic",
    attributes: { class: "fa fa-header" },
    content: `<h2 style="font-size:1.5em; font-weight:bold;">Heading 2</h2>`,
  });

  // H3 Block
  blockManager.add("h3-block", {
    label: "H3",
    category: "Basic",
    attributes: { class: "fa fa-header" },
    content: `<h3 style="font-size:1.2em; font-weight:bold;">Heading 3</h3>`,
  });

  // Variable block
  blockManager.add('hbs-var', {
    label: 'Variable',
    category: 'Logic',
    attributes: { class: "fa fa-database" },
    content: `<${PLACE_TAG} ${HBS_ATTR}="{{}}" class="hbs-token">{{}}</${PLACE_TAG}>`,
  });

    blockManager.add('hbs-each', {
      label: 'Each',
      category: 'Logic',
      attributes: { class: "fa fa-list" },
      content: `<${PLACE_TAG} ${HBS_ATTR}="{{#each}}" class="hbs-token">{{#each}}{{/each}}</${PLACE_TAG}>`,
    });
};

/**
 * Setup token binding functionality
 */
export const setupTokenBinding = (editor: any, dataSources: any) => {
  // Utility to set hbs attribute and visible inner text on the component element
  const setTokenBinding = (component: any, path: string, previewValue: any) => {
    const hbsExpr = `{{${path}}}`;
    component.addAttributes({
      [HBS_ATTR]: hbsExpr,
      'data-hbs-processed': '1',
      'data-source': path.split('.')[0],
    });

    // Update the model content so GrapesJS View Code shows the preview text,
    // not the original `{{}}` placeholder.
    const textToShow = (previewValue !== undefined && previewValue !== null) ? String(previewValue) : hbsExpr;
    setComponentText(component, textToShow);

    // (Optional) also update the live element for immediate visual feedback
    const el = component.getEl?.();
    if (el) {
      el.setAttribute(HBS_ATTR, hbsExpr);
      el.textContent = textToShow;
    }
  };

  const openVariableModal = (component: any) => {
    openExplorerModal({
      editor,
      root: dataSources,
      mode: 'variable',
      onConfirm: (path, ctx) => {
        setTokenBinding(component, path, ctx.preview);
      },
    });
  };

  const openEachModal = (component: any) => {
    openExplorerModal({
      editor,
      root: dataSources,
      mode: 'each',
      onConfirm: (path, ctx) => {
        const { preview } = ctx;

        const hbsExpr = `{{#each ${path}}}`;
        const closing = `{{/each}}`;

        component.addAttributes({
          [HBS_ATTR]: hbsExpr,         // keep opening tag in hidden attr
          'data-hbs-processed': '1',
          'data-hbs-each': path,
          'data-hbs-closing': closing, // keep closing tag in hidden attr
        });

        // Render only preview items (no hbs tags visible to user)
        const arr = getValueFromPath(dataSources, path) || [];
        const items = arr
          .map((item: any, idx: number) =>
            `<div data-hbs-index="${idx}">${escapeHtml(
              JSON.stringify(item)
            )}</div>`
          )
          .join('');

        component.components(`<div data-hbs-each="${path}">${items}</div>`);
      },
    });
  };

  return { setTokenBinding, openVariableModal, openEachModal };
};

/**
 * Setup usage highlighting
 */
export const setupUsageHighlighting = (editor: any) => {
  const addUsageStyles = () => {
    const doc = editor.Canvas.getDocument();
    if (!doc) return;
    const id = 'hbs-usage-style';
    if (doc.getElementById(id)) return;
    const style = doc.createElement('style');
    style.id = id;
    style.innerHTML = `
      .hbs-token { outline-offset: 1px; }
      .hbs-token.hbs-token--active { outline: 2px solid #0b74de; background: rgba(11,116,222,0.08); }
      .hbs-token.hbs-token--same { outline: 2px dashed #60a5fa; background: rgba(59,130,246,0.08); }
    `;
    doc.head.appendChild(style);
  };

  const clearUsageHighlights = () => {
    const doc = editor.Canvas.getDocument();
    if (!doc) return;
    doc.querySelectorAll('.hbs-token--active,.hbs-token--same').forEach((el: any) => {
      el.classList.remove('hbs-token--active');
      el.classList.remove('hbs-token--same');
    });
  };

  const highlightUsages = (raw: string, el?: HTMLElement | null) => {
    const doc = editor.Canvas.getDocument();
    if (!doc) return;
    clearUsageHighlights();
    // Active element
    if (el) el.classList.add('hbs-token--active');
    // Same variable usages
    if (raw) {
      const same = doc.querySelectorAll(`[${HBS_ATTR}="${raw}"]`) as NodeListOf<HTMLElement>;
      same.forEach(node => {
        if (node !== el) node.classList.add('hbs-token--same');
      });
    }
  };

  addUsageStyles();

  return { clearUsageHighlights, highlightUsages };
};
