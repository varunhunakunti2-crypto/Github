'use client';
import React, { useState } from 'react';
import { CommitChangesPanel } from './CommitChangesPanel';
import { useRouter } from 'next/navigation';

interface DeleteFileButtonProps {
  owner: string;
  repo: string;
  currentRef: string;
  currentPath: string;
}

export function DeleteFileButton({
  owner,
  repo,
  currentRef,
  currentPath,
}: DeleteFileButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCommitPanel, setShowCommitPanel] = useState(false);
  const router = useRouter();

  const handleDeleteTrigger = () => {
    setShowConfirm(true);
  };

  const handleConfirmNext = () => {
    setShowConfirm(false);
    setShowCommitPanel(true);
  };

  const handleCommitSuccess = (targetBranch: string) => {
    setShowCommitPanel(false);
    // Redirect to the parent directory tree view after successful deletion
    const parts = currentPath.split('/');
    parts.pop(); // Remove file name
    const parentPath = parts.join('/');
    router.push(`/${owner}/${repo}/tree/${targetBranch}/${parentPath}`);
  };

  return (
    <>
      <button
        onClick={handleDeleteTrigger}
        className="text-xs px-2.5 py-1 bg-red-950/40 border border-red-500/30 text-red-400 rounded-md hover:bg-red-900/30 transition font-space-grotesk"
      >
        Delete
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-space-grotesk">
          <div className="bg-[#14171C] border border-[#232830] rounded-lg w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-200">Delete file</h3>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete <span className="font-mono text-gray-400 font-bold">{currentPath}</span> from the <span className="font-mono text-gray-400 font-bold">{currentRef}</span> branch? This action will create a new commit.
            </p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm bg-transparent border border-[#232830] text-gray-300 rounded hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNext}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-500 transition"
              >
                Yes, delete this file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commit Panel overlay */}
      <CommitChangesPanel
        isOpen={showCommitPanel}
        onClose={() => setShowCommitPanel(false)}
        owner={owner}
        repo={repo}
        currentRef={currentRef}
        filesToCommit={[
          {
            path: currentPath,
            content: '', // Empty content signals deletion to Git Engine commit mutator
            encoding: 'base64'
          }
        ]}
        onSuccess={handleCommitSuccess}
      />
    </>
  );
}
