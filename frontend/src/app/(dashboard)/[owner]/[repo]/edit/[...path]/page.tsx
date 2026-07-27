'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { SourceControlSidebar } from '@/components/editor/SourceControlSidebar';

// Dynamically import components to prevent SSR issues with Monaco Editor
const CodeEditor = dynamic(() => import('@/components/editor/CodeEditor'), {
  ssr: false,
  loading: () => <EditorSkeletonPlaceholder />
});

const CodeDiffEditor = dynamic(
  () => import('@/components/editor/CodeEditor').then((mod) => mod.CodeDiffEditor),
  {
    ssr: false,
    loading: () => <EditorSkeletonPlaceholder />
  }
);

function EditorSkeletonPlaceholder() {
  return (
    <div className="border border-[#232830] rounded bg-[#0B0D10] overflow-hidden flex flex-col h-[500px]">
      <div className="h-10 bg-[#14171C] border-b border-[#232830] flex items-center px-4 justify-between animate-pulse">
        <div className="h-4 bg-[#232830] w-1/4 rounded"></div>
        <div className="h-4 bg-[#232830] w-12 rounded"></div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3 animate-pulse">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="flex gap-4 items-center">
            <div className="h-3 bg-[#14171C] w-6 rounded"></div>
            <div className="h-3 bg-[#232830] flex-1 rounded" style={{ maxWidth: `${Math.random() * 40 + 40}%` }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

type EditorMode = 'edit' | 'diff' | 'preview';

interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  staged: boolean;
  content: string; // Base64 modified content
  originalContent: string;
}

export default function EditFilePage({ params }: { params: Promise<{ owner: string; repo: string; path: string[] }> }) {
  const { owner, repo, path } = React.use(params);
  const router = useRouter();

  const currentRef = path[0];
  const currentPath = path.slice(1).join('/');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState(currentPath);

  // Settings
  const [mode, setMode] = useState<EditorMode>('edit');
  const [wordWrap, setWordWrap] = useState(true);
  const [minimap, setMinimap] = useState(true);
  const [inlineDiff, setInlineDiff] = useState(false);

  // Multi-file changed state (Source Control Staging)
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);

  useEffect(() => {
    async function loadFile() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/raw/${currentRef}/${currentPath}`);
        if (!res.ok) throw new Error('Failed to load file content');
        const text = await res.text();
        
        setChangedFiles([
          {
            path: currentPath,
            status: 'modified',
            staged: false,
            content: btoa(text),
            originalContent: text
          }
        ]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadFile();
  }, [owner, repo, currentRef, currentPath]);

  // Unsaved changes warning
  const isDirty = changedFiles.some(f => atob(f.content) !== f.originalContent);
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const activeFile = changedFiles.find(f => f.path === selectedFilePath);

  const handleContentChange = (newVal: string) => {
    if (!activeFile) return;
    setChangedFiles(prev => prev.map(f => {
      if (f.path === selectedFilePath) {
        return { ...f, content: btoa(newVal) };
      }
      return f;
    }));
  };

  const handleToggleStage = (filePath: string) => {
    setChangedFiles(prev => prev.map(f => {
      if (f.path === filePath) {
        return { ...f, staged: !f.staged };
      }
      return f;
    }));
  };

  const handleCancel = () => {
    if (isDirty) {
      if (!confirm('Discard all unsaved edits?')) return;
    }
    router.push(`/${owner}/${repo}/blob/${currentRef}/${currentPath}`);
  };

  const handleCommitSuccess = (targetBranch: string) => {
    router.push(`/${owner}/${repo}/tree/${targetBranch}`);
  };

  const isMarkdown = selectedFilePath.endsWith('.md');
  const activeContent = activeFile ? atob(activeFile.content) : '';
  const activeOriginalContent = activeFile ? activeFile.originalContent : '';

  if (loading) return <EditorSkeletonPlaceholder />;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {/* Edit Header / Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171C] p-4 border border-[#232830] rounded">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-500 font-mono text-sm">Active Path:</span>
          <span className="text-gray-200 font-mono text-sm font-bold bg-[#0B0D10] border border-[#232830] px-3 py-1.5 rounded">
            {selectedFilePath}
          </span>
        </div>
        
        {/* Layout/Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#0B0D10] border border-[#232830] rounded p-1">
          <button
            onClick={() => setMode('edit')}
            className={`px-3 py-1 text-xs rounded transition ${mode === 'edit' ? 'bg-[#7C5CFF] text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Edit
          </button>
          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1 text-xs rounded transition ${mode === 'diff' ? 'bg-[#7C5CFF] text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Diff
          </button>
          {isMarkdown && (
            <button
              onClick={() => setMode('preview')}
              className={`px-3 py-1 text-xs rounded transition ${mode === 'preview' ? 'bg-[#7C5CFF] text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Preview
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 select-none">
          {mode === 'edit' && (
            <>
              <button 
                onClick={() => setWordWrap(!wordWrap)}
                className={`px-3 py-1.5 text-xs border rounded transition ${wordWrap ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white' : 'bg-transparent border-[#232830] text-gray-400 hover:bg-gray-800'}`}
              >
                Word Wrap
              </button>
              <button 
                onClick={() => setMinimap(!minimap)}
                className={`px-3 py-1.5 text-xs border rounded transition ${minimap ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white' : 'bg-transparent border-[#232830] text-gray-400 hover:bg-gray-800'}`}
              >
                Minimap
              </button>
            </>
          )}
          {mode === 'diff' && (
            <button 
              onClick={() => setInlineDiff(!inlineDiff)}
              className={`px-3 py-1.5 text-xs border rounded transition ${inlineDiff ? 'bg-[#7C5CFF] border-[#7C5CFF] text-white' : 'bg-transparent border-[#232830] text-gray-400 hover:bg-gray-800'}`}
            >
              {inlineDiff ? 'Split View' : 'Inline View'}
            </button>
          )}
          <button 
            onClick={handleCancel}
            className="px-4 py-1.5 text-xs bg-transparent border border-[#232830] text-gray-300 rounded hover:bg-gray-800 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Workspace Area (Sidebar + Editor side-by-side) */}
      <div className="flex flex-col md:flex-row gap-4 flex-1 items-start min-h-[500px]">
        {/* Source Control Panel Sidebar */}
        <SourceControlSidebar 
          owner={owner}
          repo={repo}
          currentRef={currentRef}
          changedFiles={changedFiles}
          onToggleStage={handleToggleStage}
          onSelectFile={setSelectedFilePath}
          selectedFilePath={selectedFilePath}
          onCommitSuccess={handleCommitSuccess}
        />

        {/* Editor Area */}
        <div className="flex-1 w-full h-[500px]">
          {mode === 'edit' && activeFile && (
            <CodeEditor 
              value={activeContent} 
              onChange={handleContentChange} 
              filename={selectedFilePath}
            />
          )}

          {mode === 'diff' && activeFile && (
            <CodeDiffEditor 
              original={activeOriginalContent} 
              modified={activeContent} 
              filename={selectedFilePath}
              inline={inlineDiff}
            />
          )}

          {mode === 'preview' && isMarkdown && activeFile && (
            <div className="bg-[#0B0D10] border border-[#232830] rounded p-6 overflow-y-auto h-[500px] prose prose-invert w-full">
              <h3 className="text-gray-400 mb-4 border-b border-[#232830] pb-2 text-sm uppercase">Markdown Preview</h3>
              <pre className="font-mono text-sm whitespace-pre-wrap">{activeContent}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
