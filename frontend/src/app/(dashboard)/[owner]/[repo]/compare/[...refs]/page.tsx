'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MergeBranchDialog } from '@/components/repo/MergeBranchDialog';

interface CommitInfo {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

interface DiffFileInfo {
  oldPath: string;
  newPath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}

interface CompareData {
  commits: CommitInfo[];
  diff: DiffFileInfo[];
  ahead: number;
  behind: number;
}

export default function ComparePage({ params }: { params: Promise<{ owner: string; repo: string; refs: string[] }> }) {
  const { owner, repo, refs } = React.use(params);
  const router = useRouter();

  // Refs parameter is of format ["main...feature"]
  const rawRefs = refs[0] || '';
  const [baseBranch, setBaseBranch] = useState('');
  const [headBranch, setHeadBranch] = useState('');

  const [branches, setBranches] = useState<string[]>([]);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isMergeOpen, setIsMergeOpen] = useState(false);

  // Initialize base/head branches from URL parameter
  useEffect(() => {
    const parts = rawRefs.split('...');
    if (parts.length === 2) {
      setBaseBranch(decodeURIComponent(parts[0]));
      setHeadBranch(decodeURIComponent(parts[1]));
    } else {
      setBaseBranch('main');
      setHeadBranch(decodeURIComponent(parts[0]) || 'main');
    }
  }, [rawRefs]);

  // Fetch branches list for selectors
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/branches`);
        if (res.ok) {
          const list = await res.json();
          setBranches(list.map((b: any) => b.name));
        }
      } catch (e) {}
    }
    loadBranches();
  }, [owner, repo]);

  // Fetch comparison data when branches are selected
  useEffect(() => {
    if (!baseBranch || !headBranch) return;

    async function fetchCompare() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/compare/${baseBranch}...${headBranch}`);
        if (!res.ok) {
          throw new Error('Could not compare these references. Verify they exist.');
        }
        const compareResult = await res.json();
        setData(compareResult);
      } catch (err: any) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCompare();
  }, [owner, repo, baseBranch, headBranch]);

  const handleSelectorChange = (newBase: string, newHead: string) => {
    router.push(`/${owner}/${repo}/compare/${encodeURIComponent(newBase)}...${encodeURIComponent(newHead)}`);
  };

  const handleMergeSuccess = (commitSha: string) => {
    setIsMergeOpen(false);
    alert(`Successfully merged! Merge commit: ${commitSha.slice(0, 7)}`);
    router.push(`/${owner}/${repo}/tree/${baseBranch}`);
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-6xl mx-auto p-4 md:p-6 text-gray-200">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-100">Compare Changes</h2>
        <p className="text-xs text-gray-500 mt-1">Compare revisions and merge branches</p>
      </div>

      {/* Selectors Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#14171C] p-4 border border-[#232830] rounded-lg select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold uppercase">Base:</span>
          <select
            value={baseBranch}
            onChange={(e) => handleSelectorChange(e.target.value, headBranch)}
            className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-1.5 rounded text-xs focus:outline-none font-mono cursor-pointer"
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <span className="text-gray-500 text-sm">←</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold uppercase">Head:</span>
          <select
            value={headBranch}
            onChange={(e) => handleSelectorChange(baseBranch, e.target.value)}
            className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-1.5 rounded text-xs focus:outline-none font-mono cursor-pointer"
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {data && (
          <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
            {data.commits.length > 0 ? (
              <>
                <button
                  onClick={() => setIsMergeOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold bg-[#232830] border border-[#232830] hover:bg-gray-800 text-gray-300 rounded transition"
                >
                  Merge branches
                </button>
                <Link
                  href={`/${owner}/${repo}/pulls/new?base=${encodeURIComponent(baseBranch)}&head=${encodeURIComponent(headBranch)}`}
                  className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold bg-[#7C5CFF] text-white hover:bg-opacity-90 rounded text-center transition"
                >
                  Create pull request
                </Link>
              </>
            ) : (
              <button
                disabled
                title="There are no commits to compare between the selected branches."
                className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold bg-gray-800 text-gray-500 border border-[#232830] rounded cursor-not-allowed"
              >
                Create pull request
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse">Comparing revisions...</div>
      ) : data ? (
        <>
          {data.commits.length === 0 ? (
            <div className="p-12 border border-[#232830] rounded-lg bg-[#0B0D10] text-center text-gray-500 italic text-sm">
              There isn't anything to compare.<br />
              <span className="text-xs mt-1 block font-mono text-[#7C5CFF]">
                {baseBranch} and {headBranch} are identical.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Commit Count Summary */}
              <div className="p-3 bg-[#14171C] border border-[#232830] rounded-lg text-xs flex justify-between items-center">
                <span className="text-gray-400">
                  Showing <span className="font-bold text-gray-200">{data.commits.length} commit{data.commits.length > 1 ? 's' : ''}</span>
                </span>
                <span className="font-mono bg-[#0B0D10] border border-[#232830] px-2 py-0.5 rounded text-gray-400">
                  {data.diff.length} file{data.diff.length > 1 ? 's' : ''} changed
                </span>
              </div>

              {/* Commits List */}
              <div className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden">
                <div className="px-4 py-2 border-b border-[#232830] bg-[#14171C]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Commits
                </div>
                <div className="divide-y divide-[#232830]">
                  {data.commits.map((commit) => (
                    <div key={commit.hash} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-mono text-gray-300 font-bold block">{commit.message}</span>
                        <span className="text-gray-500 mt-1 block">
                          by <span className="text-gray-400 font-semibold">{commit.authorName}</span> · {new Date(commit.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] bg-[#14171C] border border-[#232830] text-gray-400 px-2 py-0.5 rounded">
                        {commit.hash.slice(0, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diff Files List */}
              <div className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden">
                <div className="px-4 py-2 border-b border-[#232830] bg-[#14171C]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Files Changed
                </div>
                <div className="divide-y divide-[#232830]">
                  {data.diff.map((file) => (
                    <div key={file.newPath} className="p-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-300 truncate w-3/4">{file.newPath}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${file.status === 'added' ? 'text-green-400 bg-green-950/20' : file.status === 'deleted' ? 'text-red-400 bg-red-950/20' : 'text-[#7C5CFF] bg-[#7C5CFF]/20'}`}>
                        {file.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Merge branch dialog */}
      {baseBranch && headBranch && (
        <MergeBranchDialog
          isOpen={isMergeOpen}
          onClose={() => setIsMergeOpen(false)}
          owner={owner}
          repo={repo}
          baseBranch={baseBranch}
          headBranch={headBranch}
          onSuccess={handleMergeSuccess}
        />
      )}
    </div>
  );
}
