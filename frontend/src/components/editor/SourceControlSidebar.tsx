'use client';
import React, { useState } from 'react';

interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  staged: boolean;
  content: string; // Base64 modified content
  originalContent: string;
}

interface SourceControlSidebarProps {
  owner: string;
  repo: string;
  currentRef: string;
  changedFiles: ChangedFile[];
  onToggleStage: (path: string) => void;
  onSelectFile: (path: string) => void;
  selectedFilePath: string;
  onCommitSuccess: (targetBranch: string) => void;
}

export function SourceControlSidebar({
  owner,
  repo,
  currentRef,
  changedFiles,
  onToggleStage,
  onSelectFile,
  selectedFilePath,
  onCommitSuccess,
}: SourceControlSidebarProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDesc, setCommitDesc] = useState('');
  const [targetBranch, setTargetBranch] = useState(currentRef);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const stagedFiles = changedFiles.filter(f => f.staged);
  const unstagedFiles = changedFiles.filter(f => !f.staged);

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedFiles.length === 0) {
      setError('No files staged for commit.');
      return;
    }
    if (!commitMessage.trim()) {
      setError('Commit message is required.');
      return;
    }
    setError('');

    try {
      setIsSaving(true);
      const payload = {
        branch: targetBranch,
        message: commitMessage + (commitDesc ? `\n\n${commitDesc}` : ''),
        files: stagedFiles.map(f => ({
          path: f.path,
          content: f.content,
          encoding: 'base64'
        }))
      };

      const res = await fetch(`/api/v1/repos/${owner}/${repo}/commits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to commit staged changes');
      }

      setCommitMessage('');
      setCommitDesc('');
      onCommitSuccess(targetBranch);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-[320px] shrink-0 bg-[#14171C] border border-[#232830] rounded flex flex-col h-[500px] font-space-grotesk overflow-hidden">
      <div className="p-4 border-b border-[#232830] bg-[#0B0D10] flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Source Control</h4>
        <span className="text-xs bg-[#232830] text-[#7C5CFF] px-2 py-0.5 rounded font-mono font-bold">
          {stagedFiles.length} / {changedFiles.length} staged
        </span>
      </div>

      {error && (
        <div className="m-3 p-2.5 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
          {error}
        </div>
      )}

      {/* Changed Files Lists */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Staged Changes */}
        <div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
            Staged Changes
          </span>
          {stagedFiles.length === 0 ? (
            <div className="text-xs text-gray-600 italic px-2 py-1">No staged changes</div>
          ) : (
            <div className="flex flex-col gap-1">
              {stagedFiles.map((file) => (
                <div 
                  key={file.path} 
                  className={`flex items-center justify-between p-1.5 rounded text-xs transition cursor-pointer hover:bg-gray-800 ${file.path === selectedFilePath ? 'bg-[#232830]' : ''}`}
                  onClick={() => onSelectFile(file.path)}
                >
                  <span className="font-mono text-gray-300 truncate w-3/4">{file.path}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-bold px-1 rounded uppercase ${file.status === 'added' ? 'text-green-400' : 'text-[#7C5CFF]'}`}>
                      {file.status[0]}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleStage(file.path); }}
                      className="text-gray-500 hover:text-red-400 font-bold px-1"
                      title="Unstage file"
                    >
                      -
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unstaged Changes */}
        <div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
            Changes
          </span>
          {unstagedFiles.length === 0 ? (
            <div className="text-xs text-gray-600 italic px-2 py-1">No unstaged changes</div>
          ) : (
            <div className="flex flex-col gap-1">
              {unstagedFiles.map((file) => (
                <div 
                  key={file.path} 
                  className={`flex items-center justify-between p-1.5 rounded text-xs transition cursor-pointer hover:bg-gray-800 ${file.path === selectedFilePath ? 'bg-[#232830]' : ''}`}
                  onClick={() => onSelectFile(file.path)}
                >
                  <span className="font-mono text-gray-300 truncate w-3/4">{file.path}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-bold text-gray-500 px-1 rounded uppercase">
                      M
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleStage(file.path); }}
                      className="text-gray-500 hover:text-green-400 font-bold px-1"
                      title="Stage file"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commit message & form */}
      <form onSubmit={handleCommitSubmit} className="p-4 border-t border-[#232830] bg-[#0B0D10] flex flex-col gap-3">
        <input 
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value.slice(0, 72))}
          className="bg-[#14171C] border border-[#232830] text-gray-200 px-3 py-1.5 rounded text-xs focus:outline-none focus:border-[#7C5CFF] font-mono"
          placeholder="Commit message..."
          required
        />

        <div className="flex flex-col gap-1.5 bg-[#14171C] p-2.5 rounded border border-[#232830] text-xs">
          <div className="flex items-center gap-2">
            <input 
              type="radio" 
              id="sc-direct"
              checked={targetBranch === currentRef}
              onChange={() => setTargetBranch(currentRef)}
            />
            <label htmlFor="sc-direct" className="text-gray-300 cursor-pointer">
              Commit to <span className="font-mono text-[#7C5CFF]">{currentRef}</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="radio" 
              id="sc-pr"
              checked={targetBranch !== currentRef}
              onChange={() => setTargetBranch(`patch-${Date.now().toString().slice(-4)}`)}
            />
            <label htmlFor="sc-pr" className="text-gray-300 cursor-pointer">
              Create branch & PR
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={stagedFiles.length === 0 || isSaving}
          className={`w-full py-2 text-xs font-semibold rounded transition text-center ${stagedFiles.length > 0 && !isSaving ? 'bg-[#7C5CFF] text-white hover:bg-opacity-90' : 'bg-[#232830] text-gray-500 cursor-not-allowed'}`}
        >
          {isSaving ? 'Committing...' : 'Commit Staged'}
        </button>
      </form>
    </div>
  );
}
