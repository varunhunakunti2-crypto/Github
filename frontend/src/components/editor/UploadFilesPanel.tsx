'use client';
import React, { useState } from 'react';
import { CommitChangesPanel } from './CommitChangesPanel';

interface UploadFilesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  currentRef: string;
  onSuccess: (targetBranch: string) => void;
}

interface PendingFile {
  name: string;
  size: number;
  content: string; // Base64
  isBinary: boolean;
}

export function UploadFilesPanel({
  isOpen,
  onClose,
  owner,
  repo,
  currentRef,
  onSuccess,
}: UploadFilesPanelProps) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [showCommitPanel, setShowCommitPanel] = useState(false);
  const [warning, setWarning] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    Array.from(fileList).forEach((file) => {
      // Large file warning threshold (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setWarning(`Warning: ${file.name} is larger than 5MB. Large files may slow down repo indexing.`);
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        // Basic binary detection
        const isBinary = !file.type.startsWith('text/') && 
                         !['.json', '.md', '.txt', '.js', '.ts', '.tsx', '.yml', '.yaml'].some(ext => file.name.endsWith(ext));

        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            content: base64Data,
            isBinary
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const filesPayload = files.map(f => ({
    path: f.name,
    content: f.content,
    encoding: 'base64' as const
  }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-space-grotesk">
      <div className="bg-[#14171C] border border-[#232830] rounded-lg w-full max-w-xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#232830] pb-2">
          <h3 className="text-lg font-bold text-gray-200">Upload files</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        {warning && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 text-yellow-400 p-3 rounded text-sm">
            {warning}
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div className="border-2 border-dashed border-[#232830] rounded-lg p-8 flex flex-col items-center justify-center bg-[#0B0D10] hover:border-[#7C5CFF] transition group cursor-pointer relative">
          <input 
            type="file" 
            multiple 
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span className="text-3xl mb-2">📁</span>
          <p className="text-sm text-gray-300 group-hover:text-[#7C5CFF] transition">
            Drag and drop files here, or click to browse
          </p>
          <span className="text-[10px] text-gray-500 mt-1">Multi-file upload supported. Max recommended size: 5MB.</span>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto border border-[#232830] rounded p-2 bg-[#0B0D10]">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 hover:bg-[#14171C] rounded border border-[#232830]/40">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 font-mono">{file.name}</span>
                  <span className="text-[10px] text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  {file.isBinary && (
                    <span className="text-[9px] bg-[#232830] text-gray-400 px-1 py-0.5 rounded">binary</span>
                  )}
                </div>
                <button 
                  onClick={() => handleRemoveFile(idx)}
                  className="text-red-400 hover:text-red-300 text-xs px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm bg-transparent border border-[#232830] text-gray-300 rounded hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button 
            onClick={() => setShowCommitPanel(true)}
            disabled={files.length === 0}
            className={`px-4 py-2 text-sm font-semibold rounded transition ${files.length > 0 ? 'bg-[#7C5CFF] text-white hover:bg-opacity-90' : 'bg-[#232830] text-gray-500 cursor-not-allowed'}`}
          >
            Commit files
          </button>
        </div>
      </div>

      <CommitChangesPanel 
        isOpen={showCommitPanel}
        onClose={() => setShowCommitPanel(false)}
        owner={owner}
        repo={repo}
        currentRef={currentRef}
        filesToCommit={filesPayload}
        onSuccess={(branch) => {
          setShowCommitPanel(false);
          onSuccess(branch);
        }}
      />
    </div>
  );
}
