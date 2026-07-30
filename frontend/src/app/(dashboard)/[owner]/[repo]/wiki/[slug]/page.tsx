'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WikiDetailPage() {
  const { owner, repo, slug } = useParams() as { owner: string; repo: string; slug: string };
  const router = useRouter();

  const [page, setPage] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${slug}?username=appi`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Page not found');
        }
        throw new Error('Failed to load page content');
      }
      const data = await res.json();
      setPage(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Page not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [owner, repo, slug]);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the wiki page '${page?.title}'?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'appi' }) // Mock user
      });
      if (res.ok) {
        window.location.href = `/${owner}/${repo}/wiki`;
      } else {
        throw new Error('Failed to delete page');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting page');
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

  if (error || !page) {
    return (
      <div className="border border-[#232830] rounded-lg bg-[#14171C] p-16 text-center flex flex-col items-center justify-center">
        <span className="text-4xl mb-4">⚠️</span>
        <h3 className="text-lg font-bold text-white mb-2">{error || 'Wiki page not found'}</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          The wiki page you requested does not exist or has been deleted.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/${owner}/${repo}/wiki`}
            className="px-4 py-2 bg-[#21262D] border border-[#30363D] text-white hover:bg-[#30363D] text-xs font-semibold rounded transition-colors"
          >
            Wiki Home
          </Link>
          <Link
            href={`/${owner}/${repo}/wiki/${slug}/edit`}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded transition-colors"
          >
            Create Page
          </Link>
        </div>
      </div>
    );
  }

  // Parse wiki internal links [[Slug]] or [[Text|Slug]]
  const renderWikiContent = (text: string) => {
    if (!text) return <span className="italic text-gray-500">No content provided.</span>;

    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const display = match[1].trim();
      const targetSlug = match[2] ? match[2].trim() : display.replace(/\s+/g, '-');

      parts.push(
        <Link
          key={matchIndex}
          href={`/${owner}/${repo}/wiki/${targetSlug}`}
          className="text-blue-500 hover:underline font-medium"
        >
          {display}
        </Link>
      );

      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <div className="whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none text-sm">{parts}</div>;
  };

  const isWriteAccess = true; // Assume true for mockup

  return (
    <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
      <div className="bg-[#0E1116] px-5 py-3 border-b border-[#232830] flex justify-between items-center">
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          📄 {page.title}
        </h2>
        <div className="flex gap-2">
          <Link
            href={`/${owner}/${repo}/wiki/${slug}/history`}
            className="px-3 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-xs font-semibold text-gray-300 rounded transition-colors"
          >
            History
          </Link>
          {isWriteAccess && (
            <>
              <Link
                href={`/${owner}/${repo}/wiki/${slug}/edit`}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-xs font-semibold text-white rounded transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-950/40 border border-red-800 hover:bg-red-900/40 text-xs font-semibold text-red-400 rounded transition-colors focus:outline-none"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="text-xs text-gray-500 mb-4 border-b border-[#232830] pb-3 flex items-center justify-between">
          <span>Last edited by <span className="font-semibold text-gray-400">@{page.lastEditedBy}</span></span>
          <span>{new Date(page.lastEditedAt).toLocaleString()}</span>
        </div>
        <div className="markdown-body">
          {renderWikiContent(page.body)}
        </div>
      </div>
    </div>
  );
}
