// TemplateEditor.tsx - Main component using modular structure
import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import presetWebpage from 'grapesjs-preset-webpage';
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
      plugins: [presetWebpage, gjsBlockBasic],
    });

    editorRef.current = editor;

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
