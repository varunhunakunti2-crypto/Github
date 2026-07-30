'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ReleaseAsset {
  id: string;
  fileName: string;
  sizeBytes: number;
  downloadCount: number;
}

interface Release {
  id: string;
  tagName: string;
  title: string;
  bodyMarkdown: string;
  isPrerelease: boolean;
  isDraft: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  assets: ReleaseAsset[];
}

export default function ReleasesListPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isWriteAccess = true; // Mocked write access for local dev
  const currentUser = 'appi';

  useEffect(() => {
    async function loadReleases() {
      try {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases?username=${currentUser}`);
        if (!res.ok) throw new Error('Failed to load releases');
        const data = await res.json();
        setReleases(data);
      } catch (err: any) {
        setError(err.message || 'Error loading releases');
      } finally {
        setIsLoading(false);
      }
    }
    loadReleases();
  }, [owner, repo]);

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHr > 0) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-gray-300 animate-pulse">
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 bg-[#1C2128] rounded w-1/4"></div>
          <div className="h-9 bg-[#1C2128] rounded w-32"></div>
        </div>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="border border-[#232830] rounded-lg bg-[#14171C] p-6 space-y-4">
              <div className="h-6 bg-[#1C2128] rounded w-1/3"></div>
              <div className="h-20 bg-[#1C2128] rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Find index of latest published release
  const latestPublishedIndex = releases.findIndex(r => !r.isDraft);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-300">
      <div className="flex justify-between items-center mb-8 border-b border-[#232830] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🏷️ Releases
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Changelogs, tags, and downloadable assets of versioned software components.
          </p>
        </div>
        {isWriteAccess && (
          <Link
            href={`/${owner}/${repo}/releases/new`}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-500 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            Draft a new release
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 text-red-400 text-xs rounded-md mb-6">
          <span>⚠️</span> Error loading releases: {error}
        </div>
      )}

      {releases.length === 0 ? (
        <div className="border border-dashed border-[#30363D] rounded-lg p-16 text-center bg-[#14171C]/50 flex flex-col items-center justify-center">
          <span className="text-5xl mb-4">🏷️</span>
          <h2 className="text-lg font-bold text-white mb-2">No releases here yet</h2>
          <p className="text-xs text-gray-500 max-w-sm mb-6 leading-relaxed">
            Releases let you pack and ship software assemblies, binary artifacts, and release notes to your team or the public.
          </p>
          {isWriteAccess ? (
            <Link
              href={`/${owner}/${repo}/releases/new`}
              className="px-4 py-2 bg-[#21262D] border border-[#30363D] text-white hover:bg-[#30363D] text-xs font-semibold rounded transition-colors"
            >
              Create the first release
            </Link>
          ) : (
            <span className="text-xs text-gray-600 italic">No public releases have been created.</span>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {releases.map((release, idx) => {
            const isLatest = idx === latestPublishedIndex;
            const assetTotalDownloads = release.assets.reduce((sum, a) => sum + a.downloadCount, 0);

            return (
              <div
                key={release.id}
                className={`border rounded-lg bg-[#14171C] overflow-hidden ${
                  isLatest ? 'border-blue-800/60 ring-1 ring-blue-900/30' : 'border-[#232830]'
                }`}
              >
                {/* Header */}
                <div className="bg-[#0E1116] px-6 py-4 border-b border-[#232830] flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Link
                      href={`/${owner}/${repo}/releases/${release.tagName}`}
                      className="font-mono text-base font-bold text-blue-400 hover:underline min-w-0 truncate"
                    >
                      {release.tagName}
                    </Link>
                    {release.isDraft && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gray-800 border border-gray-700 text-gray-300">
                        Draft
                      </span>
                    )}
                    {release.isPrerelease && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-950/60 border border-amber-800/80 text-amber-400">
                        Pre-release
                      </span>
                    )}
                    {isLatest && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-950/60 border border-blue-800/80 text-blue-400">
                        Latest
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      {release.author.avatarUrl ? (
                        <img
                          src={release.author.avatarUrl}
                          alt={release.author.username}
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {release.author.username[0].toUpperCase()}
                        </span>
                      )}
                      <span className="font-semibold text-gray-400">@{release.author.username}</span>
                    </span>

                    <span
                      title={release.publishedAt ? new Date(release.publishedAt).toLocaleString() : 'Unpublished'}
                      className="cursor-help hover:text-gray-300"
                    >
                      {release.publishedAt
                        ? `published ${getRelativeTime(release.publishedAt)}`
                        : `created ${getRelativeTime(release.createdAt)} (Draft)`}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 border-b border-[#232830]">
                  <h3 className="text-lg font-bold text-white mb-3">
                    {release.title}
                  </h3>
                  <div className="text-sm text-gray-300 prose prose-invert max-w-none line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {release.bodyMarkdown || <span className="italic text-gray-500">No release notes provided.</span>}
                  </div>
                </div>

                {/* Footer / Asset Summary */}
                <div className="bg-[#0E1116]/50 px-6 py-3 flex flex-wrap justify-between items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-3 font-mono">
                    <span>📁 {release.assets.length} Asset{release.assets.length !== 1 ? 's' : ''}</span>
                    {release.assets.length > 0 && (
                      <span>⬇️ {assetTotalDownloads} Download{assetTotalDownloads !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <Link
                    href={`/${owner}/${repo}/releases/${release.tagName}`}
                    className="text-blue-500 hover:underline font-semibold"
                  >
                    View release details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
