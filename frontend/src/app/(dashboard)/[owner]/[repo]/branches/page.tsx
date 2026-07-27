'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreateBranchDialog } from '@/components/repo/CreateBranchDialog';

interface BranchInfo {
  name: string;
  hash: string;
  isDefault: boolean;
  lastCommitMessage: string;
  lastCommitDate: string;
  authorName: string;
  authorEmail: string;
  ahead: number;
  behind: number;
}

export default function BranchesPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = React.use(params);

  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals & triggers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BranchInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search & Sorting
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated');

  async function fetchBranches() {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/repos/${owner}/${repo}/branches`);
      if (!res.ok) throw new Error('Failed to load branches');
      const data = await res.json();
      setBranches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBranches();
  }, [owner, repo]);

  const handleDeleteClick = (branch: BranchInfo) => {
    if (branch.isDefault) return; // Safeguard
    setDeleteCandidate(branch);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/repos/${owner}/${repo}/branches/${deleteCandidate.name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to delete branch');
      }
      setBranches(prev => prev.filter(b => b.name !== deleteCandidate.name));
      setDeleteCandidate(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort logic
  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const sortedBranches = [...filteredBranches].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      // Sort by last commit date descending
      return new Date(b.lastCommitDate).getTime() - new Date(a.lastCommitDate).getTime();
    }
  });

  // Default branch always pins at the top
  const defaultBranch = branches.find(b => b.isDefault);
  const otherBranches = sortedBranches.filter(b => !b.isDefault);

  return (
    <div className="flex flex-col gap-4 font-space-grotesk max-w-6xl mx-auto p-4 md:p-6 text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171C] p-4 border border-[#232830] rounded-lg">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Branches</h2>
          <p className="text-xs text-gray-500 mt-1">Manage and compare branches for {owner}/{repo}</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 text-xs font-semibold bg-[#7C5CFF] text-white rounded hover:bg-opacity-90 transition shrink-0"
        >
          New branch
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
          Error: {error}
        </div>
      )}

      {/* Filter and Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#14171C] p-3 border border-[#232830] rounded-lg">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search branches..."
          className="w-full sm:w-64 bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-1.5 rounded text-xs focus:outline-none focus:border-[#7C5CFF]"
        />
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-2 py-1 rounded focus:outline-none"
          >
            <option value="updated">Recent Activity</option>
            <option value="name">Branch Name</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">Loading branches...</div>
        ) : (
          <div className="flex flex-col divide-y divide-[#232830]">
            {/* Pinned Default Branch */}
            {defaultBranch && (
              <div className="bg-[#14171C]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1 w-full sm:w-1/2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#7C5CFF]">{defaultBranch.name}</span>
                    <span className="text-[10px] bg-[#7C5CFF]/20 text-[#7C5CFF] px-2 py-0.5 rounded font-bold uppercase">
                      Default
                    </span>
                  </div>
                  {defaultBranch.lastCommitMessage && (
                    <div className="text-xs text-gray-400 truncate">
                      <span className="text-gray-500 font-mono text-[11px] mr-1">
                        [{defaultBranch.hash.slice(0, 7)}]
                      </span>
                      {defaultBranch.lastCommitMessage}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-gray-500">
                  <span>Updated {new Date(defaultBranch.lastCommitDate).toLocaleDateString()} by {defaultBranch.authorName}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${owner}/${repo}/tree/${defaultBranch.name}`}
                      className="px-2.5 py-1 border border-[#232830] hover:bg-gray-800 rounded transition text-gray-300"
                    >
                      Browse files
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Other Branches */}
            {otherBranches.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic text-sm">
                No active branches found.
              </div>
            ) : (
              otherBranches.map((branch) => (
                <div key={branch.name} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#14171C]/20 transition">
                  <div className="flex flex-col gap-1 w-full sm:w-1/2">
                    <div className="flex items-center gap-2.5">
                      <Link 
                        href={`/${owner}/${repo}/tree/${branch.name}`} 
                        className="font-mono text-sm font-bold text-gray-300 hover:text-[#7C5CFF] hover:underline"
                      >
                        {branch.name}
                      </Link>
                      
                      {/* Ahead/Behind counts */}
                      <span className="text-[10px] text-gray-500 font-mono bg-[#14171C] border border-[#232830] px-1.5 py-0.5 rounded">
                        🟢 {branch.ahead} ahead · 🔴 {branch.behind} behind
                      </span>
                    </div>
                    {branch.lastCommitMessage && (
                      <div className="text-xs text-gray-400 truncate">
                        <span className="text-gray-500 font-mono text-[11px] mr-1">
                          [{branch.hash.slice(0, 7)}]
                        </span>
                        {branch.lastCommitMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-gray-500">
                    <span className="text-[11px]">
                      Updated {new Date(branch.lastCommitDate).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${owner}/${repo}/compare/${defaultBranch?.name || 'main'}...${branch.name}`}
                        className="px-2.5 py-1 bg-transparent border border-[#232830] text-gray-300 hover:bg-gray-800 rounded transition"
                      >
                        Compare
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(branch)}
                        className="px-2.5 py-1 bg-transparent border border-red-500/20 text-red-400 hover:bg-red-950/20 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#14171C] border border-[#232830] rounded-lg shadow-2xl p-6">
            <h3 className="text-base font-bold text-red-400 uppercase tracking-wider mb-2">Delete Branch?</h3>
            <p className="text-sm text-gray-300 mb-4">
              Are you sure you want to delete branch <span className="font-mono text-[#7C5CFF] font-bold">"{deleteCandidate.name}"</span>? 
              This action cannot be undone.
            </p>

            {deleteCandidate.ahead > 0 && (
              <div className="p-3 bg-yellow-950/20 border border-yellow-500/30 text-yellow-400 text-xs rounded mb-4">
                ⚠️ Warning: This branch has <span className="font-bold">{deleteCandidate.ahead} commits</span> that are not merged into {defaultBranch?.name || 'main'}.
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-[#232830] pt-4">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs border border-[#232830] text-gray-400 rounded hover:bg-gray-800 transition"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Branch Dialog */}
      <CreateBranchDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        owner={owner}
        repo={repo}
        defaultSourceRef={defaultBranch?.name || 'main'}
        existingBranches={branches.map(b => b.name)}
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchBranches();
        }}
      />
    </div>
  );
}
