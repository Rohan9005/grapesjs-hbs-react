// TemplateEditor.tsx - Main component using modular structure
import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import gjsBlockBasic from 'grapesjs-blocks-basic';

// Import modules
import type { TemplateEditorProps } from './modules/types';
import { hbsToHtml } from './modules/handlebarsAdapter';
import { setupHbsTokenComponent, setupBlocks, setupTokenBinding, setupUsageHighlighting } from './modules/editorSetup';
import { setupComponentAddHandler, setupDoubleClickHandler, setupSelectionHandler } from './modules/eventHandlers';
import { exportHbs } from './modules/exportUtils';
import { debounce } from 'lodash';

export default function TemplateEditor({
  initialHbs = '<div>{{title}}</div>',
  sampleData = { title: 'Hello' },
  onChange,
  dataSources = {},
  onEditor,
}: TemplateEditorProps) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      fromElement: false,
      height: '100%',
      storageManager: false, // you control save/load
      plugins: [gjsBlockBasic],
    });

    let cssString = `
            /* Theming */

        /* Primary color for the background */
        .gjs-one-bg {
          background-color: #ffff;
        }

        /* Secondary color for the text color */
        .gjs-two-color {
          color: #161676;
        }

        /* Tertiary color for the background */
        .gjs-three-bg {
          background-color: #7c7cae;
          color: white;
        }

        /* Quaternary color for the text color */
        .gjs-four-color,
        .gjs-four-color-h:hover {
          color: #2a2aa1;
        }
    `

    const style = document.createElement('style');
    style.innerText = cssString;
    document.head.appendChild(style);

    editorRef.current = editor;

    // expose editor to parent
    if (onEditor) onEditor(editor);

    // Open Blocks panel by default
    editor.Panels.getButton("views", "open-blocks")?.set("active", true);
    setEditorReady(true);

    // Load initial HBS
    const initialHtml = hbsToHtml(initialHbs, sampleData);
    editor.setComponents(initialHtml);

    // Setup editor components and functionality
    setupHbsTokenComponent(editor);
    setupBlocks(editor);

    const { openVariableModal } = setupTokenBinding(editor, dataSources);
    const { clearUsageHighlights, highlightUsages } = setupUsageHighlighting(editor);

    // Setup event handlers
    setupComponentAddHandler(editor, openVariableModal);
    setupDoubleClickHandler(editor, openVariableModal);
    setupSelectionHandler(editor, openVariableModal, clearUsageHighlights, highlightUsages);

    const updateContent = debounce(() => {
      exportHbs(editor, onChange);
    }, 500);
    editor.on('update', updateContent);

    return () => editor.destroy();
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div ref={containerRef} className="border rounded" />
      {!editorReady && <div>Loading editor…</div>}
    </div>
  );
}
