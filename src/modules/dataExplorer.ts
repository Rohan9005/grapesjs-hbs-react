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

  // State
  let currentPath = startPath;
  let currentNode = currentPath ? getValueFromPath(root, currentPath) : root;
  //const selection = { path: null as string | null, kind: '' as string };
  // Use variables that can be properly updated
  let selectedPath: string | null = null;
  let selectedKind: string = '';

  // UI builders
  const buildHeader = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="font-weight:600">
        ${mode === 'variable' ? 'Bind Variable' : mode === 'each' ? 'Bind Each (collection)' : 'Bind If (condition)'}
      </div>
      <div id="gjs-breadcrumb" style="font-size:12px;color:#6b7280;word-break:break-all"></div>
    </div>`;

  const buildFooter = () => `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:8px">
      <div id="gjs-preview" style="font-size:12px;color:#111827"></div>
      <div style="display:flex;gap:8px">
        ${mode === 'each' ? `
          <input id="gjs-from" type="number" placeholder="from" style="width:90px;padding:6px;border:1px solid #e5e7eb;border-radius:8px" />
          <input id="gjs-to" type="number" placeholder="to" style="width:90px;padding:6px;border:1px solid #e5e7eb;border-radius:8px" />` : ''}
        <button id="gjs-modal-cancel" style="padding:6px 12px;border-radius:8px;border:1px solid #d1d5db;background:#fff">Cancel</button>
        <button id="gjs-modal-ok" style="padding:6px 12px;border-radius:8px;border:0;background:#0b74de;color:#fff">OK</button>
      </div>
    </div>`;

  const buildContainer = () => `
    <div style="font-family:system-ui,sans-serif;padding:12px;min-width:720px;max-width:900px">
      ${buildHeader()}
      <div id="gjs-explorer" style="margin-top:10px"></div>
      ${buildFooter()}
    </div>`;

  // Render helpers
  const renderBreadcrumb = () => {
    const breadcrumb = document.getElementById('gjs-breadcrumb');
    if (!breadcrumb) return;
    const parts = currentPath ? currentPath.split('.') : [];
    let acc: string[] = [];
    breadcrumb.innerHTML = ['<span data-jump="" style="cursor:pointer;color:#0b74de">root</span>']
      .concat(
        parts.map((p) => {
          acc.push(p);
          return `<span style=\"margin:0 6px;color:#9ca3af\">/</span>
                  <span data-jump=\"${escapeHtml(acc.join('.'))}\" style=\"cursor:pointer;color:#0b74de\">${escapeHtml(p)}</span>`;
        })
      )
      .join('');
  };

  const renderExplorer = () => {
    const explorer = document.getElementById('gjs-explorer');
    if (!explorer) return;
    explorer.innerHTML = renderCards(currentNode, currentPath);
  };

  const updatePreview = () => {
    const pv = document.getElementById('gjs-preview');
    if (!pv) return;
    if (!selectedPath) {
      pv.innerHTML = `<span style="color:#6b7280">Select a value to preview…</span>`;
      return;
    }
    const compiled = compilePathPreview(selectedPath, root);
    if (mode === 'variable') {
      pv.innerHTML = `Bind to <b>{{${escapeHtml(selectedPath)}}</b> → Preview: <i>${escapeHtml(String(compiled))}</i>`;
    } else if (mode === 'if') {
      const truthy = Boolean(getValueFromPath(root, selectedPath));
      pv.innerHTML = `Condition <b>{{${escapeHtml(selectedPath)}}</b> → <b>${truthy ? 'truthy' : 'falsy'}</b>`;
    } else if (mode === 'each') {
      const node = getValueFromPath(root, selectedPath);
      const len = Array.isArray(node) ? node.length : 0;
      pv.innerHTML = `Collection <b>{{${escapeHtml(selectedPath)}}</b> → <i>${len} items</i>`;
    }
  };

  const attachCardHandlers = () => {
    const explorer = document.getElementById('gjs-explorer');
    if (!explorer) return;
    explorer.querySelectorAll<HTMLElement>('.gjs-card').forEach((card) => {
      card.addEventListener('click', () => {
        console.log('card clicked');
        const path = card.getAttribute('data-path')!;
        const kind = card.getAttribute('data-kind')!;
        console.log('path', path);
        console.log('kind', kind);
        const val = getValueFromPath(root, path);
        if (kind === 'object' || kind === 'array') {
          currentPath = path;
          currentNode = val;
          selectedPath = null; // Clear selection
          selectedKind = '';
          console.log('Selection path in If', selectedPath);
          updatePreview();
          rerender();
        } else {
          selectedPath = path;
          selectedKind = kind;
          console.log('Selection path in else', selectedPath);
          updatePreview();
          explorer.querySelectorAll<HTMLElement>('.gjs-card').forEach((el) => (el.style.outline = ''));
          card.style.outline = '2px solid #0b74de';
        }
      });
    });
  };

  const attachBreadcrumbHandlers = () => {
    const breadcrumb = document.getElementById('gjs-breadcrumb');
    if (!breadcrumb) return;
    breadcrumb.querySelectorAll<HTMLElement>('[data-jump]').forEach((el) => {
      el.addEventListener('click', () => {
        const jump = el.getAttribute('data-jump') || '';
        currentPath = jump;
        currentNode = jump ? getValueFromPath(root, jump) : root;
        selectedPath = null;
        selectedKind = '';
        console.log("(attachBreadcrumbHandlers) setting selection.path to null");
        updatePreview();
        rerender();
      });
    });
  };

  const rerender = () => {
    renderBreadcrumb();
    renderExplorer();
    attachCardHandlers();
    attachBreadcrumbHandlers();
    updatePreview();
  };

  const handleCancel = () => editor.Modal.close();

  const handleOk = () => {
    console.log('HandleOk called, selectedPath:', selectedPath);
    if (!selectedPath) {
      console.log('HandleOk called, selectedPath not available', selectedPath);
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
    // First return the selected path; value is available via preview in context
    onConfirm(selectedPath, { preview, selectedKind: selectedKind, range: Object.keys(range).length ? range : undefined });
    editor.Modal.close();
  };

  // Open modal and wire controls
  editor.Modal.setTitle('Select data').setContent(buildContainer()).open();

  setTimeout(() => {
    rerender();
    const btnCancel = document.getElementById('gjs-modal-cancel');
    const btnOk = document.getElementById('gjs-modal-ok');
    btnCancel?.addEventListener('click', handleCancel);
    btnOk?.addEventListener('click', () => {
      handleOk();
    });
  }, 500);
};

