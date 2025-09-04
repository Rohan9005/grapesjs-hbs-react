// dataExplorer.ts - Data explorer modal functionality

import { typeOf, previewStr, escapeHtml, getValueFromPath } from './utils';
import { compilePathPreview } from './handlebarsAdapter';
import type { ExplorerModalOptions, DataEntry } from './types';

/**
 * Build card grid for a node (object/array)
 */
const renderCards = (node: any, basePath: string): string => {
  const entries: DataEntry[] = [];
  if (typeOf(node) === 'object') {
    Object.keys(node).forEach((k) => {
      const val = node[k];
      const p = basePath ? `${basePath}.${k}` : k;
      entries.push({ label: k, path: p, value: val, kind: typeOf(val) });
    });
  } else if (typeOf(node) === 'array') {
    const arr: any[] = node;
    const max = Math.min(arr.length, 50); // cap
    for (let i = 0; i < max; i++) {
      const val = arr[i];
      const p = basePath ? `${basePath}.${i}` : String(i);
      entries.push({ label: `[${i}]`, path: p, value: val, kind: typeOf(val) });
    }
  }

  if (!entries.length) {
    return `<div style="padding:8px;color:#666">(no fields)</div>`;
  }

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:8px">
      ${entries
        .map((e) => {
          const badge = e.kind === 'object' ? 'Object' : e.kind === 'array' ? 'Array' : 'Value';
          return `
              <div class="gjs-card" data-path="${escapeHtml(e.path)}" data-kind="${e.kind}" style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;cursor:pointer;background:#fff">
                <div style="font-weight:600;margin-bottom:6px;word-break:break-all">${escapeHtml(e.label)}
                  <span style="float:right;font-size:12px;color:#2563eb">${badge}</span>
                </div>
                <div style="font-size:12px;color:#374151;word-break:break-word;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(previewStr(e.value))}</div>
              </div>`;
        })
        .join('')}
    </div>
  `;
};

/**
 * Open explorer modal for data binding
 */
export const openExplorerModal = (opts: ExplorerModalOptions) => {
  const { editor, root, startPath = '', mode, onConfirm } = opts;

  if (!root || (typeof root !== 'object' && !Array.isArray(root))) {
    alert('No data sources available to map. Pass `dataSources` prop to TemplateEditor.');
    return;
  }

  let currentPath = startPath;
  let currentNode = currentPath ? getValueFromPath(root, currentPath) : root;
  let selectedPath: string | null = null;
  let selectedKind = '';

  const header = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="font-weight:600">${mode === 'variable' ? 'Bind Variable' : mode === 'each' ? 'Bind Each (collection)' : 'Bind If (condition)'}
      </div>
      <div id="gjs-breadcrumb" style="font-size:12px;color:#6b7280;word-break:break-all"></div>
    </div>`;

  const footer = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:8px">
      <div id="gjs-preview" style="font-size:12px;color:#111827"></div>
      <div style="display:flex;gap:8px">
        ${mode === 'each' ? `<input id="gjs-from" type="number" placeholder="from" style="width:90px;padding:6px;border:1px solid #e5e7eb;border-radius:8px" />
                            <input id="gjs-to" type="number" placeholder="to" style="width:90px;padding:6px;border:1px solid #e5e7eb;border-radius:8px" />` : ''}
        <button id="gjs-modal-cancel" style="padding:6px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff">Cancel</button>
        <button id="gjs-modal-ok" style="padding:6px 12px;border-radius:8px;border:0;background:#0b74de;color:#fff">OK</button>
      </div>
    </div>`;

  const containerHtml = `
    <div style="font-family:system-ui,sans-serif;padding:12px;min-width:720px;max-width:900px">
      ${header}
      <div id="gjs-explorer" style="margin-top:10px"></div>
      ${footer}
    </div>`;

  editor.Modal.setTitle('Select data').setContent(containerHtml).open();

  const rerender = () => {
    const explorer = document.getElementById('gjs-explorer');
    const breadcrumb = document.getElementById('gjs-breadcrumb');
    if (!explorer || !breadcrumb) return;

    // Breadcrumb UI
    const parts = currentPath ? currentPath.split('.') : [];
    let acc: string[] = [];
    const crumb = ['<span data-jump="" style="cursor:pointer;color:#0b74de">root</span>']
      .concat(
        parts.map((p) => {
          acc.push(p);
          return `<span style="margin:0 6px;color:#9ca3af">/</span><span data-jump="${escapeHtml(acc.join('.'))}" style="cursor:pointer;color:#0b74de">${escapeHtml(p)}</span>`;
        })
      )
      .join('');
    breadcrumb.innerHTML = crumb;

    explorer.innerHTML = renderCards(currentNode, currentPath);

    // click to drill or select
    explorer.querySelectorAll<HTMLElement>('.gjs-card').forEach((card) => {
      card.addEventListener('click', () => {
        const path = card.getAttribute('data-path')!;
        const kind = card.getAttribute('data-kind')!;
        const val = getValueFromPath(root, path);

        if (kind === 'object' || kind === 'array') {
          currentPath = path;
          currentNode = val;
          selectedPath = null;
          selectedKind = '';
          updatePreview();
          rerender();
        } else {
          selectedPath = path;
          selectedKind = kind;
          updatePreview();
          // Soft highlight
          explorer.querySelectorAll<HTMLElement>('.gjs-card').forEach((el) => (el.style.outline = ''));
          card.style.outline = '2px solid #0b74de';
        }
      });
    });

    // breadcrumb jump
    breadcrumb.querySelectorAll<HTMLElement>('[data-jump]').forEach((el) => {
      el.addEventListener('click', () => {
        const jump = el.getAttribute('data-jump') || '';
        currentPath = jump;
        currentNode = jump ? getValueFromPath(root, jump) : root;
        selectedPath = null;
        selectedKind = '';
        updatePreview();
        rerender();
      });
    });

    updatePreview();
  };

  const updatePreview = () => {
    const pv = document.getElementById('gjs-preview');
    if (!pv) return;

    if (!selectedPath) {
      pv.innerHTML = `<span style="color:#6b7280">Select a value to preview…</span>`;
      return;
    }

    // Mode-aware preview text
    const compiled = compilePathPreview(selectedPath, root);
    if (mode === 'variable') {
      pv.innerHTML = `Bind to <b>{{${escapeHtml(selectedPath)}}}</b> → Preview: <i>${escapeHtml(String(compiled))}</i>`;
    } else if (mode === 'if') {
      const truthy = Boolean(getValueFromPath(root, selectedPath));
      pv.innerHTML = `Condition <b>{{${escapeHtml(selectedPath)}}}</b> → <b>${truthy ? 'truthy' : 'falsy'}</b>`;
    } else if (mode === 'each') {
      const node = getValueFromPath(root, selectedPath);
      const len = Array.isArray(node) ? node.length : 0;
      pv.innerHTML = `Collection <b>{{${escapeHtml(selectedPath)}}}</b> → <i>${len} items</i>`;
    }
  };

  // Wire buttons
  setTimeout(() => {
    rerender();

    const btnCancel = document.getElementById('gjs-modal-cancel');
    const btnOk = document.getElementById('gjs-modal-ok');

    btnCancel?.addEventListener('click', () => editor.Modal.close());
    btnOk?.addEventListener('click', () => {
      if (!selectedPath) {
        alert('Please select a value');
        return;
      }

      const preview = compilePathPreview(selectedPath, root);
      const range: { from?: number; to?: number } = {};
      if (mode === 'each') {
        const fromEl = document.getElementById('gjs-from') as HTMLInputElement | null;
        const toEl = document.getElementById('gjs-to') as HTMLInputElement | null;
        if (fromEl?.value) range.from = Number(fromEl.value);
        if (toEl?.value) range.to = Number(toEl.value);
      }

      onConfirm(selectedPath, { preview, selectedKind, range: Object.keys(range).length ? range : undefined });
      editor.Modal.close();
    });
  }, 50);
};
