// eventHandlers.ts - Editor event handlers

import { HBS_ATTR } from './types';

/**
 * Setup component add event handler
 */
export const setupComponentAddHandler = (
  editor: any, 
  openVariableModal: (component: any) => void,
  openEachModal: (c: any) => void
) => {
  // Listen for components being added to the canvas
  editor.on('component:add', (component: any) => {
    try {
      const walk = (comp: any) => {
        const attrs = comp.getAttributes?.();
        const raw = attrs?.[HBS_ATTR] as string | undefined;
        if (raw) {
          if (raw === '{{}}') return openVariableModal(comp);
          if (raw.startsWith('{{#if')) return;
          if (raw.startsWith('{{#each')) return openEachModal(comp);
        }
        comp.components?.().forEach((c: any) => walk(c));
      };
      walk(component);
    } catch (err) {
      console.error(err);
    }
  });
};

/**
 * Setup double click event handler
 */
export const setupDoubleClickHandler = (editor: any, openVariableModal: (component: any) => void, openEachModal: (component: any) => void) => {
  // Double click to remap any token
  editor.on('component:dblclick', (component: any) => {
    try {
      const attrs = component.getAttributes?.();
      const raw = attrs?.[HBS_ATTR] as string | undefined;
      if (!raw) return;
      if (raw.startsWith('{{#if')) return;
      if (raw.startsWith('{{#each')) return openEachModal(component);
      return openVariableModal(component);
    } catch { }
  });
};

/**
 * Setup selection event handler
 */
export const setupSelectionHandler = (
  editor: any, 
  openVariableModal: (component: any) => void,
  clearUsageHighlights: () => void,
  highlightUsages: (raw: string, el?: HTMLElement | null) => void
) => {
  // Open modal and highlight on user selection (canvas or layers click)
  editor.on('component:selected', (component: any, opts: any) => {
    try {
      const attrs = component?.getAttributes?.();
      const raw = attrs?.[HBS_ATTR] as string | undefined;
      if (!raw) {
        clearUsageHighlights();
        return;
      }
      // Only handle simple variable tokens here
      if (raw.startsWith('{{#if') || raw.startsWith('{{#each')) {
        clearUsageHighlights();
        return;
      }

      const el = component.getEl?.();
      highlightUsages(raw, el);

      // If user initiated the selection (mouse/layers), open the modal
      const userEvent = opts?.event || opts?.fromLayer || opts?.fromTarget;
      if (userEvent) {
        openVariableModal(component);
      }
    } catch {
      // noop
    }
  });
};
