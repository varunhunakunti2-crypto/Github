'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReleaseAsset {
  id: string;
  fileName: string;
  fileUrl: string;
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
  targetCommitSha: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  assets: ReleaseAsset[];
}

export default function ReleaseDetailPage() {
  const { owner, repo, tag } = useParams() as { owner: string; repo: string; tag: string };
  const router = useRouter();

  const [release, setRelease] = useState<Release | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousTag, setPreviousTag] = useState<string | null>(null);

  const isWriteAccess = true; // Mocked write access for local dev
  const currentUser = 'appi';

  const loadReleaseDetails = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases/tag/${tag}?username=${currentUser}`);
      if (!res.ok) throw new Error('Release not found');
      const data = await res.json();
      setRelease(data);

      // Try to determine the previous tag by listing releases
      const listRes = await fetch(`/api/v1/repositories/${owner}/${repo}/releases?username=${currentUser}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const published = listData.filter((r: any) => !r.isDraft);
        const idx = published.findIndex((r: any) => r.tagName === tag);
        if (idx !== -1 && idx + 1 < published.length) {
          setPreviousTag(published[idx + 1].tagName);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading release details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReleaseDetails();
  }, [owner, repo, tag]);

  const handleDelete = async () => {
    if (!release) return;

    // Conceptual delete option: ask if they also want to delete the underlying git tag
    const deleteTagObj = window.confirm(
      `Do you want to ALSO delete the underlying Git tag '${release.tagName}' from the repository?\n\n` +
      `Click OK to delete BOTH the release notes and the Git tag.\n` +
      `Click Cancel to delete ONLY the GitForge release metadata (keeping the Git tag).`
    );

    const reallyDelete = window.confirm(`Are you sure you want to delete the release '${release.title}'? This action is irreversible.`);
    if (!reallyDelete) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases/${release.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser,
          deleteTag: deleteTagObj
        })
      });

      if (res.ok) {
        router.push(`/${owner}/${repo}/releases`);
      } else {
        throw new Error('Failed to delete release');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting release');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-gray-300 animate-pulse">
        <div className="h-8 bg-[#1C2128] rounded w-1/3 mb-6"></div>
        <div className="h-40 bg-[#1C2128] rounded w-full"></div>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <span className="text-4xl block mb-4">⚠️</span>
        <h2 className="text-lg font-bold text-white mb-2">{error || 'Release not found'}</h2>
        <p className="text-xs text-gray-500 mb-6">The version release you are looking for does not exist or has been deleted.</p>
        <Link
          href={`/${owner}/${repo}/releases`}
          className="px-4 py-2 bg-[#21262D] border border-[#30363D] text-white hover:bg-[#30363D] text-xs font-semibold rounded transition-colors"
        >
          Back to Releases
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-gray-300 space-y-6">
      {/* Navigation & Actions */}
      <div className="flex justify-between items-center border-b border-[#232830] pb-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/${owner}/${repo}/releases`}
            className="text-xs text-blue-500 hover:underline"
          >
            ← Back to Releases
          </Link>
        </div>
        {isWriteAccess && (
          <div className="flex gap-2">
            <Link
              href={`/${owner}/${repo}/releases/new?id=${release.id}`}
              className="px-3 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-xs font-semibold text-gray-300 rounded transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-950/40 border border-red-800 hover:bg-red-900/40 text-xs font-semibold text-red-400 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Release Main Container */}
      <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
        {/* Title Banner */}
        <div className="bg-[#0E1116] px-6 py-5 border-b border-[#232830]">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-xl font-bold text-white font-mono">{release.tagName}</h1>
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
          </div>
          <h2 className="text-lg text-gray-200 font-semibold mb-3">{release.title}</h2>
          
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-[#232830]/50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {release.author.username[0].toUpperCase()}
                </span>
                <span className="font-semibold text-gray-400">@{release.author.username}</span>
              </span>
              <span>
                {release.publishedAt
                  ? `Published on ${new Date(release.publishedAt).toLocaleString()}`
                  : `Created on ${new Date(release.createdAt).toLocaleString()} (Draft)`}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span>commit:</span>
              <span className="text-gray-400 bg-[#1C2128] border border-[#30363D] px-1.5 py-0.5 rounded">
                {release.targetCommitSha.substring(0, 7)}
              </span>
            </div>
          </div>
        </div>

        {/* Release Notes Body */}
        <div className="p-6 border-b border-[#232830]">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Release Notes</h3>
          <div className="text-sm text-gray-300 leading-relaxed prose prose-invert max-w-none whitespace-pre-wrap">
            {release.bodyMarkdown || <span className="italic text-gray-500">No release notes provided.</span>}
          </div>
        </div>

        {/* Assets Section */}
        <div className="p-6 bg-[#0E1116]/30">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Assets</h3>
          <div className="space-y-2">
            {/* Binary Assets List */}
            {release.assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-[#1C2128] border border-[#30363D] rounded-md text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">📦</span>
                  <a
                    href={`${asset.fileUrl}?username=${currentUser}`}
                    download
                    className="text-blue-400 hover:text-blue-300 font-semibold truncate hover:underline"
                  >
                    {asset.fileName}
                  </a>
                  <span className="text-[10px] text-gray-500 font-mono">
                    ({formatSize(asset.sizeBytes)})
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                  <span>⬇️ {asset.downloadCount} download{asset.downloadCount !== 1 ? 's' : ''}</span>
                  <a
                    href={`${asset.fileUrl}?username=${currentUser}`}
                    download
                    className="px-2.5 py-1 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-800 text-blue-400 font-sans font-bold rounded transition-colors"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}

            {/* Auto-generated source archives */}
            {!release.isDraft && (
              <>
                <div className="flex items-center justify-between p-3 bg-[#1C2128] border border-[#30363D] rounded-md text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">🤐</span>
                    <a
                      href={`/api/v1/repositories/${owner}/${repo}/releases/archive/${release.tagName}?format=zip&username=${currentUser}`}
                      className="text-blue-400 hover:text-blue-300 font-semibold truncate hover:underline"
                    >
                      Source code (zip)
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/v1/repositories/${owner}/${repo}/releases/archive/${release.tagName}?format=zip&username=${currentUser}`}
                      className="px-2.5 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] font-sans font-bold rounded transition-colors text-[10px] text-gray-300"
                    >
                      Download
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#1C2128] border border-[#30363D] rounded-md text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">🗜️</span>
                    <a
                      href={`/api/v1/repositories/${owner}/${repo}/releases/archive/${release.tagName}?format=tar.gz&username=${currentUser}`}
                      className="text-blue-400 hover:text-blue-300 font-semibold truncate hover:underline"
                    >
                      Source code (tar.gz)
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/v1/repositories/${owner}/${repo}/releases/archive/${release.tagName}?format=tar.gz&username=${currentUser}`}
                      className="px-2.5 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] font-sans font-bold rounded transition-colors text-[10px] text-gray-300"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compare Link */}
      {previousTag && (
        <div className="text-center py-2 bg-[#14171C] border border-[#232830] rounded-lg">
          <Link
            href={`/${owner}/${repo}/compare/${previousTag}...${release.tagName}`}
            className="text-xs font-semibold text-blue-500 hover:underline"
          >
            🔄 Compare changes since previous release ({previousTag} → {release.tagName})
          </Link>
        </div>
      )}
    </div>
  );
}
