'use client';
import React, { useState, useEffect } from 'react';
import { validateBranchName } from '@/lib/git-utils';
import { useRouter } from 'next/navigation';

interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  defaultSourceRef?: string;
  existingBranches: string[];
  onSuccess?: (newBranchName: string) => void;
}

export function CreateBranchDialog({
  isOpen,
  onClose,
  owner,
  repo,
  defaultSourceRef = 'main',
  existingBranches,
  onSuccess
}: CreateBranchDialogProps) {
  const router = useRouter();
  const [branchName, setBranchName] = useState('');
  const [sourceRef, setSourceRef] = useState(defaultSourceRef);
  const [customSource, setCustomSource] = useState('');
  const [useCustomSource, setUseCustomSource] = useState(false);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Run live validation on branchName change
  useEffect(() => {
    if (!branchName) {
      setValidationError(null);
      return;
    }
    const err = validateBranchName(branchName);
    setValidationError(err);
  }, [branchName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateBranchName(branchName);
    if (err) {
      setValidationError(err);
      return;
    }
    setApiError('');

    const fromRef = useCustomSource ? customSource : sourceRef;
    if (!fromRef.trim()) {
      setApiError('Source reference is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/repos/${owner}/${repo}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          name: branchName,
          fromRef
        })
      });

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(`Branch name "${branchName}" already exists.`);
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create branch');
      }

      setBranchName('');
      if (onSuccess) {
        onSuccess(branchName);
      } else {
        if (confirm(`Branch "${branchName}" created! Navigate to its files now?`)) {
          router.push(`/${owner}/${repo}/tree/${branchName}`);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-space-grotesk">
      <div className="w-full max-w-md bg-[#14171C] border border-[#232830] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#232830] bg-[#0B0D10] flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Create a branch</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {apiError && (
            <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
              {apiError}
            </div>
          )}

          {/* New Branch Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Branch name</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className={`bg-[#0B0D10] border text-gray-200 px-3 py-2 rounded text-sm focus:outline-none font-mono ${validationError ? 'border-red-500/50 focus:border-red-500' : 'border-[#232830] focus:border-[#7C5CFF]'}`}
              placeholder="e.g. feature/auth-fix"
              required
              disabled={isSubmitting}
            />
            {validationError && (
              <span className="text-[11px] text-red-400 mt-0.5">{validationError}</span>
            )}
          </div>

          {/* Source branch selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Source ref</label>
            
            <div className="flex items-center gap-4 text-xs mb-1 bg-[#0B0D10] p-1.5 rounded border border-[#232830]">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                <input 
                  type="radio" 
                  checked={!useCustomSource} 
                  onChange={() => setUseCustomSource(false)} 
                  className="accent-[#7C5CFF]"
                />
                Existing branch
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                <input 
                  type="radio" 
                  checked={useCustomSource} 
                  onChange={() => setUseCustomSource(true)} 
                  className="accent-[#7C5CFF]"
                />
                Tag or Commit SHA
              </label>
            </div>

            {!useCustomSource ? (
              <select
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-[#7C5CFF] font-mono cursor-pointer"
                disabled={isSubmitting}
              >
                {existingBranches.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-2 rounded text-sm focus:outline-none focus:border-[#7C5CFF] font-mono"
                placeholder="e.g. v1.0.0 or a8f9d2c"
                required={useCustomSource}
                disabled={isSubmitting}
              />
            )}
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
              disabled={isSubmitting || !!validationError || !branchName.trim()}
              className={`px-4 py-2 text-xs font-semibold rounded text-white transition ${isSubmitting || !!validationError || !branchName.trim() ? 'bg-[#232830] text-gray-500 cursor-not-allowed' : 'bg-[#7C5CFF] hover:bg-opacity-90'}`}
            >
              {isSubmitting ? 'Creating...' : 'Create branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
