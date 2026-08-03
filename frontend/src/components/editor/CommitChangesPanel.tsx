'use client';
import React, { useState } from 'react';

interface CommitFilePayload {
  path: string;
  content: string; // Base64 or plain string depending on encoding
  encoding: 'base64' | 'utf-8';
}

interface CommitChangesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  currentRef: string;
  filesToCommit: CommitFilePayload[];
  onSuccess: (targetBranch: string) => void;
}

export function CommitChangesPanel({
  isOpen,
  onClose,
  owner,
  repo,
  currentRef,
  filesToCommit,
  onSuccess,
}: CommitChangesPanelProps) {
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDesc, setCommitDesc] = useState('');
  const [targetBranch, setTargetBranch] = useState(currentRef);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictState, setConflictState] = useState<{ local: string; remote: string } | null>(null);

  if (!isOpen) return null;

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) {
      setError('Commit message summary is required.');
      return;
    }
    setError('');
    setConflictState(null);

    try {
      setIsSaving(true);
      const payload = {
        branch: targetBranch,
        message: commitMessage + (commitDesc ? `\n\n${commitDesc}` : ''),
        files: filesToCommit
      };

      const res = await fetch(`/api/v1/repos/${owner}/${repo}/commits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 409) {
        // Optimistic concurrency conflict detected
        const data = await res.json().catch(() => ({}));
        setConflictState({
          local: filesToCommit[0]?.content || '',
          remote: data.remoteContent || 'Modified by another user'
        });
        throw new Error('Conflict detected. Someone else has updated this file since you loaded it.');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save changes');
      }

      onSuccess(targetBranch);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-[#14171C] border border-[#232830] rounded-lg w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4">
        <h3 className="text-lg font-bold text-gray-200">Commit changes</h3>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {conflictState ? (
          <div className="bg-[#0B0D10] border border-[#232830] p-4 rounded flex flex-col gap-3">
            <p className="text-xs text-gray-400">
              Note: 3-way merge is out of scope. Please choose one of the options below:
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-[#232830] text-gray-300 text-xs rounded hover:bg-gray-700"
              >
                Reload (Lose local changes)
              </button>
              <button 
                onClick={() => setConflictState(null)}
                className="px-3 py-1.5 bg-[#7C5CFF] text-white text-xs rounded hover:bg-opacity-90"
              >
                Retry anyway (Force overwrite)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCommitSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Commit message (summary)</label>
              <input 
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value.slice(0, 72))}
                className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-2 rounded focus:outline-none focus:border-[#7C5CFF] font-mono text-sm"
                placeholder="Update file description"
                required
              />
              <span className="text-[10px] text-gray-500 text-right">{commitMessage.length}/72 characters</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Extended description (optional)</label>
              <textarea 
                value={commitDesc}
                onChange={(e) => setCommitDesc(e.target.value)}
                rows={3}
                className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-2 rounded focus:outline-none focus:border-[#7C5CFF] resize-none font-mono text-sm"
                placeholder="Add an optional description of this commit"
              />
            </div>

            <div className="flex flex-col gap-2 bg-[#0B0D10] p-4 rounded border border-[#232830]">
              <label className="text-xs text-gray-400 font-semibold mb-1">Target Branch</label>
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  id="direct-commit"
                  checked={targetBranch === currentRef}
                  onChange={() => setTargetBranch(currentRef)}
                />
                <label htmlFor="direct-commit" className="text-sm text-gray-200 cursor-pointer">
                  Commit directly to <span className="font-mono text-[#7C5CFF]">{currentRef}</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  id="pr-commit"
                  checked={targetBranch !== currentRef}
                  onChange={() => setTargetBranch(`patch-${Date.now().toString().slice(-4)}`)}
                />
                <label htmlFor="pr-commit" className="text-sm text-gray-200 cursor-pointer">
                  Create a new branch and start a pull request
                </label>
              </div>
              {targetBranch !== currentRef && (
                <input 
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="bg-[#14171C] border border-[#232830] text-gray-200 px-3 py-1.5 rounded font-mono text-xs focus:outline-none mt-2"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-transparent border border-[#232830] text-gray-300 rounded hover:bg-gray-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-semibold bg-[#7C5CFF] text-white rounded hover:bg-opacity-90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Commit Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
