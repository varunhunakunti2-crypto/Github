'use client';
import React, { useState } from 'react';

interface MergeBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  baseBranch: string;
  headBranch: string;
  onSuccess: (commitSha: string) => void;
}

export function MergeBranchDialog({
  isOpen,
  onClose,
  owner,
  repo,
  baseBranch,
  headBranch,
  onSuccess
}: MergeBranchDialogProps) {
  const [strategy, setStrategy] = useState<'merge' | 'squash' | 'rebase'>('merge');
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflictMsg, setConflictMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConflictMsg('');

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/repos/${owner}/${repo}/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          base: baseBranch,
          head: headBranch,
          strategy,
          message: customMessage || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.conflicts) {
          setConflictMsg(data.message || 'Conflicts occurred during merge.');
          return;
        }
        throw new Error(data.message || 'Failed to merge branch');
      }

      onSuccess(data.commitSha);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-md bg-[#14171C] border border-[#232830] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-gray-200">
        <div className="px-6 py-4 border-b border-[#232830] bg-[#0B0D10] flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Merge branches</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
              {error}
            </div>
          )}

          {conflictMsg ? (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 text-yellow-400 text-xs rounded">
                ⚠️ {conflictMsg}
              </div>
              <p className="text-xs text-gray-400">
                To resolve this conflict, please merge the branches locally using your CLI client and push the resolved reference back.
              </p>
              <div className="bg-[#0B0D10] p-2.5 rounded border border-[#232830] font-mono text-[10px] text-gray-300 select-all">
                git checkout {baseBranch}<br />
                git merge {headBranch}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold bg-[#232830] text-gray-300 rounded hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">
                You are about to merge <span className="font-mono text-[#7C5CFF] font-bold">{headBranch}</span> into <span className="font-mono text-[#7C5CFF] font-bold">{baseBranch}</span>.
              </p>

              {/* Strategy picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Merge Strategy</label>
                <div className="flex flex-col gap-2 bg-[#0B0D10] p-3 rounded border border-[#232830]">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      checked={strategy === 'merge'}
                      onChange={() => setStrategy('merge')}
                      className="mt-0.5 accent-[#7C5CFF]"
                    />
                    <div>
                      <span className="font-bold text-gray-300 block">Create merge commit</span>
                      <span className="text-[10px] text-gray-500">All commits in this head branch will be added to base via a merge commit.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      checked={strategy === 'squash'}
                      onChange={() => setStrategy('squash')}
                      className="mt-0.5 accent-[#7C5CFF]"
                    />
                    <div>
                      <span className="font-bold text-gray-300 block">Squash and merge</span>
                      <span className="text-[10px] text-gray-500">Combine all commits of head into a single commit in base.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      checked={strategy === 'rebase'}
                      onChange={() => setStrategy('rebase')}
                      className="mt-0.5 accent-[#7C5CFF]"
                    />
                    <div>
                      <span className="font-bold text-gray-300 block">Rebase and merge</span>
                      <span className="text-[10px] text-gray-500">Reapply head commits individually on top of base.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Commit message (optional)</label>
                <input
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-2 rounded text-xs focus:outline-none focus:border-[#7C5CFF] font-mono"
                  placeholder={`Merge branch '${headBranch}' into '${baseBranch}'`}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-[#232830] pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs border border-[#232830] text-gray-400 rounded hover:bg-gray-800 transition"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#7C5CFF] hover:bg-opacity-90 text-white rounded transition"
                >
                  {isSubmitting ? 'Merging...' : 'Confirm merge'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
