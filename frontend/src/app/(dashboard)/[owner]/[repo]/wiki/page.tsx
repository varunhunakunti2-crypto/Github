'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWiki } from './context';

export default function WikiHomePage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const { pages, isLoading, loadPages } = useWiki();
  const router = useRouter();

  const [homePage, setHomePage] = useState<any | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    async function loadHome() {
      // Check if Home slug is in pages list
      const hasHome = pages.some(p => p.slug === 'Home');
      if (!hasHome) {
        setIsPageLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/Home?username=appi`);
        if (res.ok) {
          const data = await res.json();
          setHomePage(data);
        }
      } catch (err) {
        console.error('Error loading Home page:', err);
      } finally {
        setIsPageLoading(false);
      }
    }

    if (!isLoading) {
      loadHome();
    }
  }, [owner, repo, pages, isLoading]);

  if (isLoading || isPageLoading) {
    return (
      <div className="border border-[#232830] rounded-lg bg-[#14171C] p-8 text-center text-gray-500 animate-pulse">
        <div className="h-6 bg-[#1C2128] rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-[#1C2128] rounded w-full"></div>
      </div>
    );
  }

  // If no pages at all, render empty state
  if (pages.length === 0) {
    return (
      <div className="border border-dashed border-[#30363D] rounded-lg p-16 text-center bg-[#14171C]/50 flex flex-col items-center justify-center">
        <span className="text-5xl mb-4">📖</span>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to your repository wiki!</h2>
        <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
          Wikis provide a place in your repository to document your project, share knowledge, and details.
        </p>
        <Link
          href={`/${owner}/${repo}/wiki/Home/edit`}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Create the first page
        </Link>
      </div>
    );
  }

  // If Home page doesn't exist but other pages do, redirect to the first page slug,
  // or prompt to create Home page. Prompting to create Home page is standard and clean.
  if (!homePage) {
    return (
      <div className="border border-[#232830] rounded-lg bg-[#14171C] p-8 text-center flex flex-col items-center justify-center">
        <span className="text-4xl mb-4">🏠</span>
        <h3 className="text-lg font-bold text-white mb-2">Welcome Page Not Created</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          This wiki has pages, but the landing "Home" page hasn't been created yet.
        </p>
        <Link
          href={`/${owner}/${repo}/wiki/Home/edit`}
          className="px-4 py-2 bg-[#21262D] border border-[#30363D] text-white hover:bg-[#30363D] text-xs font-semibold rounded transition-colors"
        >
          + Create Home page
        </Link>
      </div>
    );
  }

  // Helper to render basic wiki markdown links: [[Other Page]] -> link
  const renderWikiContent = (text: string) => {
    if (!text) return <span className="italic text-gray-500">No content provided.</span>;

    // Convert [[Slug]] or [[Text|Slug]] to Link elements
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add text before the match
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const display = match[1].trim();
      const slug = match[2] ? match[2].trim() : display.replace(/\s+/g, '-');

      parts.push(
        <Link
          key={matchIndex}
          href={`/${owner}/${repo}/wiki/${slug}`}
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

  return (
    <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
      <div className="bg-[#0E1116] px-5 py-3 border-b border-[#232830] flex justify-between items-center">
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          🏠 Home
        </h2>
        <div className="flex gap-2">
          <Link
            href={`/${owner}/${repo}/wiki/Home/history`}
            className="px-3 py-1 bg-[#21262D] border border-[#30363D] hover:bg-[#30363D] text-xs font-semibold text-gray-300 rounded transition-colors"
          >
            History
          </Link>
          <Link
            href={`/${owner}/${repo}/wiki/Home/edit`}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-xs font-semibold text-white rounded transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>
      <div className="p-6">
        <div className="text-xs text-gray-500 mb-4 border-b border-[#232830] pb-3 flex items-center justify-between">
          <span>Last edited by <span className="font-semibold text-gray-400">@{homePage.lastEditedBy}</span></span>
          <span>{new Date(homePage.lastEditedAt).toLocaleString()}</span>
        </div>
        <div className="markdown-body">
          {renderWikiContent(homePage.body)}
        </div>
      </div>
    </div>
  );
}
