'use client';
import React, { useEffect } from 'react';
import MonacoEditor, { loader, DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { gitforgeDarkTheme } from '../../lib/monaco-theme';

// Map extensions to Monaco language IDs
export function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    py: 'python',
    go: 'go',
    rs: 'rust',
    sh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql',
  };
  return map[ext] || 'plaintext';
}

interface CodeEditorProps {
  value: string;
  onChange?: (val: string) => void;
  filename: string;
  readOnly?: boolean;
}

// Skeleton loading fallback mimicking Phase 11 file-preview layout
export function EditorSkeleton() {
  return (
    <div className="border border-[#232830] rounded bg-[#0B0D10] overflow-hidden flex flex-col h-[500px]">
      <div className="h-10 bg-[#14171C] border-b border-[#232830] flex items-center px-4 justify-between animate-pulse">
        <div className="h-4 bg-[#232830] w-1/4 rounded"></div>
        <div className="h-4 bg-[#232830] w-12 rounded"></div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3 animate-pulse">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="flex gap-4 items-center">
            <div className="h-3 bg-[#14171C] w-6 rounded"></div>
            <div className="h-3 bg-[#232830] flex-1 rounded" style={{ maxWidth: `${Math.random() * 40 + 40}%` }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CodeEditor({ value, onChange, filename, readOnly = false }: CodeEditorProps) {
  const language = getLanguageFromExtension(filename);

  useEffect(() => {
    // Register the custom theme with Monaco loader
    loader.init().then((monaco) => {
      monaco.editor.defineTheme('gitforge-dark', gitforgeDarkTheme as any);
    });
  }, []);

  return (
    <div className="border border-[#232830] rounded overflow-hidden bg-[#0B0D10] h-[500px] w-full">
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        theme="gitforge-dark"
        onChange={(val) => onChange && onChange(val || '')}
        loading={<EditorSkeleton />}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          cursorBlinking: 'smooth',
          cursorStyle: 'line',
          tabSize: 2,
        }}
      />
    </div>
  );
}

interface CodeDiffEditorProps {
  original: string;
  modified: string;
  filename: string;
  inline?: boolean;
}

export function CodeDiffEditor({ original, modified, filename, inline = false }: CodeDiffEditorProps) {
  const language = getLanguageFromExtension(filename);

  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.defineTheme('gitforge-dark', gitforgeDarkTheme as any);
    });
  }, []);

  return (
    <div className="border border-[#232830] rounded overflow-hidden bg-[#0B0D10] h-[500px] w-full">
      <MonacoDiffEditor
        height="100%"
        language={language}
        original={original}
        modified={modified}
        theme="gitforge-dark"
        loading={<EditorSkeleton />}
        options={{
          renderSideBySide: !inline,
          readOnly: true,
          originalEditable: false,
          minimap: { enabled: false },
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
