'use client';

import React, { useState, useEffect } from 'react';

interface Review {
  id: string;
  reviewer: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body: string;
  createdAt: string;
}

interface MergeActionAreaProps {
  owner: string;
  repo: string;
  prNumber: number;
  pr: {
    id: string;
    title: string;
    baseBranch: string;
    compareBranch: string;
    status: 'OPEN' | 'DRAFT' | 'MERGED' | 'CLOSED';
    creator: { username: string };
  };
  onMergeSuccess: () => void;
}

export default function MergeActionArea({
  owner,
  repo,
  prNumber,
  pr,
  onMergeSuccess,
}: MergeActionAreaProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'squash' | 'rebase'>('merge');
  const [squashCommitMessage, setSquashCommitMessage] = useState('');
  const [merging, setMerging] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState(false);
  const [branchDeleted, setBranchDeleted] = useState(false);
  const [error, setError] = useState('');

  // Mock branch protection rules configuration
  const requiredApprovalsCount = 1;
  const isCodeownersRequired = true;
  const requiredCodeowner = 'reviewer-one'; // Mocked codeowner for backend/typescript files

  // Real conflict check state
  const [hasConflicts, setHasConflicts] = useState(false);
  const [conflictingFiles, setConflictingFiles] = useState<string[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(true);

  // Fetch reviews on mount and when PR status changes
  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${prNumber}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Check for merge conflicts on mount
  const checkConflicts = async () => {
    try {
      setCheckingConflicts(true);
      const res = await fetch(`/api/v1/repos/${owner}/${repo}/compare/${pr.baseBranch}...${pr.compareBranch}`);
      if (res.ok) {
        const data = await res.json();
        // If compare endpoint returns a conflicts array, use it
        if (data.conflicts && data.conflicts.length > 0) {
          setHasConflicts(true);
          setConflictingFiles(data.conflicts);
        } else {
          setHasConflicts(false);
          setConflictingFiles([]);
        }
      } else {
        // If compare fails, assume there might be a conflict
        setHasConflicts(true);
        setConflictingFiles(['Unable to determine — compare failed']);
      }
    } catch (e) {
      // Network error — don't block merge, but warn
      setHasConflicts(false);
    } finally {
      setCheckingConflicts(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    checkConflicts();
  }, [owner, repo, prNumber, pr.status]);

  // Compute latest review status per reviewer
  const getLatestReviewsMap = () => {
    const map: Record<string, Review> = {};
    // Sort oldest first so latest overwrites
    const sorted = [...reviews].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sorted.forEach(r => {
      map[r.reviewer] = r;
    });
    return map;
  };

  const latestReviews = Object.values(getLatestReviewsMap());
  const approvals = latestReviews.filter(r => r.event === 'APPROVE');
  const changesRequested = latestReviews.filter(r => r.event === 'REQUEST_CHANGES');
  const codeownerApproved = approvals.some(r => r.reviewer === requiredCodeowner);

  // Status checks stub: always passing for this phase
  const statusChecksPassing = true; 

  const isApproved = approvals.length >= requiredApprovalsCount;
  const isCodeownerMet = !isCodeownersRequired || codeownerApproved;
  const noChangesRequested = changesRequested.length === 0;

  const isMergeDisabled = 
    pr.status !== 'OPEN' || 
    !isApproved || 
    !isCodeownerMet || 
    !noChangesRequested || 
    !statusChecksPassing || 
    hasConflicts;

  // Initialize default squash commit message
  useEffect(() => {
    setSquashCommitMessage(`${pr.title} (#${prNumber})`);
  }, [pr.title, prNumber]);

  const handleMerge = async () => {
    try {
      setMerging(true);
      setError('');
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          merge_method: mergeStrategy,
          commit_title: mergeStrategy === 'squash' ? squashCommitMessage : `${pr.title} (#${prNumber})`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to merge pull request');
      }

      onMergeSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMerging(false);
    }
  };

  const handleDeleteBranch = async () => {
    try {
      setDeletingBranch(true);
      setError('');
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/branches/${pr.compareBranch}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setBranchDeleted(true);
      } else {
        throw new Error('Failed to delete branch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingBranch(false);
    }
  };

  if (pr.status === 'MERGED') {
    return (
      <div className="bg-green-950/20 border border-green-500/30 rounded-lg p-5 flex flex-col gap-3 font-space-grotesk text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center font-bold text-green-400 text-xs">✓</span>
          <span className="font-bold text-gray-200 text-sm">Pull Request Merged Successfully</span>
        </div>
        <p className="text-gray-400">The changes from {pr.compareBranch} have been integrated into {pr.baseBranch}.</p>
        
        {!branchDeleted ? (
          <button
            onClick={handleDeleteBranch}
            disabled={deletingBranch}
            className="self-start bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-950/50 py-1.5 px-3 rounded font-semibold transition disabled:opacity-50"
          >
            {deletingBranch ? 'Deleting branch...' : `Delete ${pr.compareBranch} branch`}
          </button>
        ) : (
          <span className="text-gray-500 italic mt-1">Branch {pr.compareBranch} deleted.</span>
        )}
      </div>
    );
  }

  if (pr.status === 'CLOSED') {
    return (
      <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-5 flex flex-col gap-2 font-space-grotesk text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-red-400 text-sm">Pull Request Closed</span>
        </div>
        <p className="text-gray-400">This pull request was closed without merging.</p>
      </div>
    );
  }

  if (pr.status === 'DRAFT') {
    return (
      <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-5 flex flex-col gap-2 font-space-grotesk text-xs">
        <span className="font-bold text-gray-300 text-sm">PR is in Draft State</span>
        <p className="text-gray-400">Draft PRs cannot be merged. Click "Ready for review" in the header to allow merging.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5 flex flex-col gap-4 font-space-grotesk text-xs">
      <div>
        <span className="font-bold text-gray-300 uppercase tracking-wider">Merge Action Area</span>
        <p className="text-gray-500 mt-0.5">Approve requirements, branch protections, and merge strategies.</p>
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/20 border border-red-500/30 text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Rules status block */}
      <div className="flex flex-col gap-2 bg-[#0B0D10] border border-[#232830] rounded p-3 text-[11px]">
        {/* Approvals */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Required approvals ({approvals.length} of {requiredApprovalsCount})</span>
          <span className={isApproved ? 'text-green-400 font-bold' : 'text-amber-500 font-bold'}>
            {isApproved ? '✓ Met' : '⚠ Missing'}
          </span>
        </div>

        {/* CODEOWNERS */}
        {isCodeownersRequired && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">CODEOWNERS approval (from @{requiredCodeowner})</span>
            <span className={codeownerApproved ? 'text-green-400 font-bold' : 'text-amber-500 font-bold'}>
              {codeownerApproved ? '✓ Approved' : `⚠ Waiting on @${requiredCodeowner}`}
            </span>
          </div>
        )}

        {/* Changes requested */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Review blocks</span>
          <span className={noChangesRequested ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
            {noChangesRequested ? '✓ None' : `⚠ ${changesRequested.length} changes requested`}
          </span>
        </div>

        {/* Conflicts */}
        <div className="flex flex-col gap-1.5 border-t border-[#232830] pt-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Merge conflicts</span>
            {checkingConflicts ? (
              <span className="text-gray-500 italic animate-pulse">Checking...</span>
            ) : (
              <span className={!hasConflicts ? 'text-green-400' : 'text-red-400 font-bold'}>
                {!hasConflicts ? '✓ No conflicts' : `⚠ ${conflictingFiles.length} conflicting file(s)`}
              </span>
            )}
          </div>
          {hasConflicts && conflictingFiles.length > 0 && !checkingConflicts && (
            <div className="bg-red-950/10 border border-red-500/20 rounded p-2 mt-1">
              <span className="text-red-400 font-bold text-[10px] uppercase block mb-1">Conflicting Files</span>
              <ul className="list-disc list-inside text-red-300/80 text-[10px] space-y-0.5">
                {conflictingFiles.map((f, i) => (
                  <li key={i} className="font-mono">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Merge Strategy selectors */}
      <div className="flex flex-col gap-2">
        <label className="font-bold text-gray-400 uppercase">Merge Strategy</label>
        <select
          value={mergeStrategy}
          onChange={(e) => setMergeStrategy(e.target.value as any)}
          className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-2 rounded focus:outline-none cursor-pointer"
        >
          <option value="merge">Create a merge commit (all commits merged via a 2-parent commit)</option>
          <option value="squash">Squash and merge (squash all PR commits into 1 single-parent commit)</option>
          <option value="rebase">Rebase and merge (rebase head branch onto base branch without merge commit)</option>
        </select>
      </div>

      {/* Squash message editor (Step 7) */}
      {mergeStrategy === 'squash' && (
        <div className="flex flex-col gap-1.5 border border-dashed border-[#232830] p-3 rounded">
          <label className="font-bold text-gray-400 uppercase">Squash Commit Message</label>
          <input
            type="text"
            value={squashCommitMessage}
            onChange={(e) => setSquashCommitMessage(e.target.value)}
            className="bg-[#0B0D10] border border-[#232830] rounded px-3 py-1.5 text-gray-200 focus:outline-none focus:border-[#7C5CFF]"
          />
          <span className="text-[10px] text-gray-500">Defaults to pull request title. This commit will contain exactly one parent.</span>
        </div>
      )}

      {/* Warning message if disabled */}
      {isMergeDisabled && (
        <div className="p-3 bg-amber-950/20 border border-amber-500/30 text-amber-500 text-[11px] rounded leading-relaxed">
          <strong>Merge Blocked:</strong> {
            hasConflicts ? 'This branch has conflicts that must be resolved locally before merging.' :
            !isApproved ? 'Requires at least 1 approval.' :
            !isCodeownerMet ? `Must receive approval from CODEOWNER @${requiredCodeowner}.` :
            !noChangesRequested ? 'One or more reviewers have requested changes.' :
            'Please verify status checks are passing.'
          }
        </div>
      )}

      {/* Confirm Merge Button */}
      <button
        onClick={handleMerge}
        disabled={isMergeDisabled || merging}
        className="w-full bg-green-600 text-white font-bold py-2.5 rounded text-sm hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {merging ? 'Merging changes...' : 'Merge pull request'}
      </button>
    </div>
  );
}
