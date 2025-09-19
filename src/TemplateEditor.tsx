// TemplateEditor.tsx - Main component using modular structure
import { useEffect, useRef, useState } from 'react';
import grapesjs, { Editor } from 'grapesjs';
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
  onChange,
  dataSources = { title: 'Hello' },
}: TemplateEditorProps) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const lastAppliedHbsRef = useRef<string | null>(null);

  function setupEventHandler(editor: Editor, dataSources: any) {
    const { openVariableModal } = setupTokenBinding(editor, dataSources);
    const { clearUsageHighlights, highlightUsages } = setupUsageHighlighting(editor);

    // Setup event handlers
    setupComponentAddHandler(editor, openVariableModal);
    setupDoubleClickHandler(editor, openVariableModal);
    setupSelectionHandler(editor, openVariableModal, clearUsageHighlights, highlightUsages);
  }

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    if (!initialHbs) return;
  
    // Skip if HBS hasn't actually changed
    if (lastAppliedHbsRef.current === initialHbs) return;
  
    const editor = editorRef.current;
    const newHtml = hbsToHtml(initialHbs, dataSources);
  
    console.log("[REACT-PACKAGE] - Template Reloaded", { initialHbs, dataSources });
  
    editor.setComponents(newHtml);
    setupEventHandler(editor, dataSources);
  
    lastAppliedHbsRef.current = initialHbs;
  
    console.log("[REACT-PACKAGE] - Template Loading Completed");
  }, [editorReady, initialHbs, dataSources]);


  useEffect(() => {
    console.log("[REACT-PACKAGE] - Editor Initilization Started");

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

    // Open Blocks panel by default
    editor.Panels.getButton("views", "open-blocks")?.set("active", true);
    setEditorReady(true);

    // Load initial HBS
    if (!initialHbs) return;
    const initialHtml = hbsToHtml(initialHbs, dataSources);
    editor.setComponents(initialHtml);

    // Setup editor components and functionality
    setupHbsTokenComponent(editor);
    setupBlocks(editor);

    setupEventHandler(editor, dataSources);

    const updateContent = debounce(() => {
      const newHbs = exportHbs(editor, onChange);
    
      // Prevent feedback loop: only propagate if changed
      if (lastAppliedHbsRef.current !== newHbs) {
        lastAppliedHbsRef.current = newHbs;
        onChange?.(newHbs);
      }
    }, 500);
    
    editor.on('update', updateContent);
    

    console.log("[REACT-PACKAGE] - Editor Initilization Completed");

    return () => editor.destroy();
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <div ref={containerRef} className="border rounded" />
      {!editorReady && <div>Loading editor…</div>}
    </div>
  );
}
