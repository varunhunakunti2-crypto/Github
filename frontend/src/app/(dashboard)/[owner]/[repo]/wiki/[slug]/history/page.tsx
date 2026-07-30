'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Revision {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

export default function WikiHistoryPage() {
  const { owner, repo, slug } = useParams() as { owner: string; repo: string; slug: string };
  const router = useRouter();

  const [history, setHistory] = useState<Revision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected revision for view/revert
  const [selectedRev, setSelectedRev] = useState<any | null>(null);
  const [isRevLoading, setIsRevLoading] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${slug}/history?username=appi`);
      if (!res.ok) throw new Error('Failed to load wiki page history');
      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Error loading history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [owner, repo, slug]);

  const handleViewRevision = async (sha: string) => {
    setIsRevLoading(true);
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${slug}/revision/${sha}?username=appi`);
      if (!res.ok) throw new Error('Failed to load historical revision');
      const data = await res.json();
      setSelectedRev(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load revision');
    } finally {
      setIsRevLoading(false);
    }
  };

  const handleRevert = async (rev: any) => {
    const confirmRevert = window.confirm(`Are you sure you want to revert to revision ${rev.sha.substring(0, 7)}? This will create a new commit restoring the previous content.`);
    if (!confirmRevert) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rev.title,
          body: rev.body,
          message: `Revert to version ${rev.sha.substring(0, 7)}: "${rev.message}"`,
          username: 'appi' // Mock user
        })
      });
      if (res.ok) {
        setSelectedRev(null);
        await loadHistory();
        alert('Wiki page reverted successfully!');
      } else {
        throw new Error('Failed to revert');
      }
    } catch (err: any) {
      alert(err.message || 'Error reverting wiki page');
    }
  };

  if (isLoading) {
    return (
      <div className="border border-[#232830] rounded-lg bg-[#14171C] p-8 text-center text-gray-500 animate-pulse">
        <div className="h-8 bg-[#1C2128] rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-[#1C2128] rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Historical Revision Details Panel (if one is selected) */}
      {selectedRev && (
        <div className="border border-amber-800 rounded-lg bg-amber-950/15 overflow-hidden">
          <div className="bg-amber-900/30 px-5 py-3 border-b border-amber-800 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block mb-0.5">Historical View</span>
              <h3 className="text-sm font-bold text-white">Revision {selectedRev.sha.substring(0, 7)}: "{selectedRev.message}"</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRevert(selectedRev)}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-xs font-semibold text-white rounded transition-colors"
              >
                Revert to this version
              </button>
              <button
                onClick={() => setSelectedRev(null)}
                className="px-3 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-xs font-semibold text-gray-300 rounded transition-colors"
              >
                Close preview
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="text-xs text-gray-500 mb-4 border-b border-amber-800/40 pb-3 flex items-center justify-between">
              <span>Authored by <span className="font-semibold text-gray-400">@{selectedRev.lastEditedBy}</span></span>
              <span>{new Date(selectedRev.lastEditedAt).toLocaleString()}</span>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert bg-[#0E1116] p-4 rounded-md border border-[#232830]">
              {selectedRev.body}
            </div>
          </div>
        </div>
      )}

      {/* Commit History List */}
      <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
        <div className="bg-[#0E1116] px-5 py-3 border-b border-[#232830] flex justify-between items-center">
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            ⏳ Revision History: {slug.replace(/-/g, ' ')}
          </h2>
          <Link
            href={`/${owner}/${repo}/wiki/${slug}`}
            className="px-3 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-xs font-semibold text-gray-300 rounded transition-colors"
          >
            Back to page
          </Link>
        </div>

        {error && (
          <div className="p-5 text-center text-red-500">
            <span>⚠️</span> Error loading history: {error}
          </div>
        )}

        {!error && (
          <div className="flex flex-col">
            {history.length > 0 ? (
              history.map((rev, index) => (
                <div
                  key={rev.sha}
                  className="p-4 border-b border-[#232830] last:border-0 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#1C2128]/45 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-lg mt-0.5 flex-shrink-0">📝</span>
                    <div className="min-w-0">
                      <button
                        onClick={() => handleViewRevision(rev.sha)}
                        className="text-white hover:text-blue-400 font-semibold text-sm text-left block focus:outline-none focus:underline"
                        disabled={isRevLoading}
                      >
                        {rev.message}
                      </button>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                        <span className="font-semibold text-gray-400">@{rev.authorName}</span>
                        <span>committed on {new Date(rev.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className="font-mono text-gray-500 bg-[#1C2128] border border-[#30363D] px-2 py-0.5 rounded">
                      {rev.sha.substring(0, 7)}
                    </span>
                    <button
                      onClick={() => handleViewRevision(rev.sha)}
                      className="px-3 py-1 border border-[#30363D] hover:bg-[#30363D] text-gray-300 font-semibold rounded transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-16 text-center text-gray-500 italic">
                No commit history recorded for this page.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
