'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface CommitInfo {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  signatureStatus?: string; // 'G', 'B', 'N', etc.
}

export default function CommitsTimelinePage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = React.use(params);

  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedRef, setSelectedRef] = useState('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch branches list for selection
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

  // Fetch commits timeline
  useEffect(() => {
    async function loadCommits() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/commits?ref=${encodeURIComponent(selectedRef)}`);
        if (!res.ok) throw new Error('Failed to fetch commit timeline');
        const list = await res.json();
        setCommits(list);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCommits();
  }, [owner, repo, selectedRef]);

  // Group commits by date (YYYY-MM-DD)
  const groupCommitsByDate = () => {
    const groups: { [key: string]: CommitInfo[] } = {};
    commits.forEach(commit => {
      const dateKey = new Date(commit.date).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(commit);
    });
    return groups;
  };

  const groupedCommits = groupCommitsByDate();

  return (
    <div className="flex flex-col gap-6 font-space-grotesk max-w-4xl mx-auto p-4 md:p-6 text-gray-200">
      {/* Header and selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14171C] p-4 border border-[#232830] rounded-lg">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Commits</h2>
          <p className="text-xs text-gray-500 mt-1">Timeline of all revision changes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold uppercase">Ref:</span>
          <select
            value={selectedRef}
            onChange={(e) => setSelectedRef(e.target.value)}
            className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-1.5 rounded text-xs focus:outline-none font-mono cursor-pointer"
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse">Loading commits timeline...</div>
      ) : commits.length === 0 ? (
        <div className="p-12 border border-[#232830] rounded-lg bg-[#0B0D10] text-center text-gray-500 italic text-sm">
          No commits found on branch {selectedRef}.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.keys(groupedCommits).map(date => (
            <div key={date} className="flex flex-col gap-3">
              <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider pl-2 border-l-2 border-[#7C5CFF]">
                Commits on {date}
              </h3>
              
              <div className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden divide-y divide-[#232830]">
                {groupedCommits[date].map((commit) => (
                  <div key={commit.hash} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#14171C]/20 transition">
                    <div className="flex flex-col gap-1 w-full sm:w-2/3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${owner}/${repo}/commit/${commit.hash}`}
                          className="font-bold text-sm text-gray-300 hover:text-[#7C5CFF] hover:underline"
                        >
                          {commit.message}
                        </Link>
                        
                        {/* Verified badge */}
                        {commit.signatureStatus === 'G' && (
                          <span className="text-[9px] bg-green-950/30 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase select-none">
                            Verified
                          </span>
                        )}
                        {commit.signatureStatus && commit.signatureStatus !== 'G' && commit.signatureStatus !== 'N' && (
                          <span className="text-[9px] bg-red-950/30 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase select-none" title="Signature check failed or expired">
                            Unverified
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Authored by <span className="text-gray-400 font-semibold">{commit.authorName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      {/* Short SHA copyable */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(commit.hash);
                          alert('Copied full SHA to clipboard!');
                        }}
                        className="font-mono text-[10px] bg-[#14171C] border border-[#232830] hover:bg-gray-800 text-gray-400 px-2.5 py-1 rounded transition"
                        title="Copy full SHA"
                      >
                        {commit.hash.slice(0, 7)}
                      </button>

                      <Link
                        href={`/${owner}/${repo}/tree/${commit.hash}`}
                        className="px-2.5 py-1 border border-[#232830] hover:bg-gray-800 rounded transition text-gray-300"
                        title="Browse files at this commit"
                      >
                        Browse files
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
