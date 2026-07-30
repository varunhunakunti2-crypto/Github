'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Author {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Discussion {
  id: string;
  number: number;
  category: string;
  title: string;
  body: string;
  authorId: string;
  author: Author;
  answeredCommentId: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

export default function DiscussionsListPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [pinnedDiscussions, setPinnedDiscussions] = useState<Discussion[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState<string>('All categories');
  const [sortBy, setSortBy] = useState<string>('recently_active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Categories list matching DATABASE.md and Phase 9 enum
  const categories = [
    'All categories',
    'General',
    'Q&A',
    'Ideas',
    'Announcements',
    'Show and tell'
  ];

  // Helper to map category to icon
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'General': return '💬';
      case 'Q&A': return '🙋';
      case 'Ideas': return '💡';
      case 'Announcements': return '📢';
      case 'Show and tell': return '🙌';
      default: return '💬';
    }
  };

  // Helper to map category to badge colors
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'General': return 'bg-blue-950/60 text-blue-400 border-blue-800';
      case 'Q&A': return 'bg-purple-950/60 text-purple-400 border-purple-800';
      case 'Ideas': return 'bg-yellow-950/60 text-yellow-400 border-yellow-800';
      case 'Announcements': return 'bg-pink-950/60 text-pink-400 border-pink-800';
      case 'Show and tell': return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  async function loadDiscussions(cursorVal: string | null = null, isAppend: boolean = false) {
    if (!isAppend) setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All categories') {
        queryParams.set('category', selectedCategory);
      }
      if (sortBy) {
        queryParams.set('sort', sortBy);
      }
      if (searchQuery) {
        queryParams.set('q', searchQuery);
      }
      if (cursorVal) {
        queryParams.set('cursor', cursorVal);
      }

      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load discussions');
      
      const data = await res.json();
      if (isAppend) {
        setDiscussions(prev => [...prev, ...data.discussions]);
      } else {
        setDiscussions(data.discussions);
        setPinnedDiscussions(data.pinned || []);
      }
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  // Load on filter / sort change
  useEffect(() => {
    loadDiscussions(null, false);
  }, [owner, repo, selectedCategory, sortBy, searchQuery]);

  const handleLoadMore = () => {
    if (nextCursor) {
      loadDiscussions(nextCursor, true);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderDiscussionRow = (disc: Discussion, isPinned: boolean = false) => {
    return (
      <div 
        key={disc.id} 
        className={`p-4 flex items-center justify-between gap-4 border-b border-[#232830] transition-colors hover:bg-[#1C2128]/50 ${
          isPinned ? 'bg-blue-950/10 border-l-2 border-l-blue-500 pl-3.5' : ''
        }`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl mt-0.5 flex-shrink-0">
            {isPinned ? '📌' : getCategoryIcon(disc.category)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link 
                href={`/${owner}/${repo}/discussions/${disc.number}`}
                className="text-white hover:text-blue-400 font-semibold text-sm md:text-base line-clamp-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {disc.title}
              </Link>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeClass(disc.category)}`}>
                {disc.category}
              </span>
              {disc.answeredCommentId && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-950/80 text-green-400 border border-green-800 flex items-center gap-1">
                  ✓ Answered
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">@{disc.author.username}</span>
              <span>•</span>
              <span>last active {getRelativeTime(disc.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span>💬</span>
            <span className="font-semibold text-gray-400">{disc._count.comments}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>💬</span> Discussions
          </h1>
          <p className="text-xs text-gray-500 mt-1">Ask questions, share ideas, and connect with other developers.</p>
        </div>
        <Link
          href={`/${owner}/${repo}/discussions/new`}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          New discussion
        </Link>
      </div>

      {/* Category Tabs (scrolling on mobile) */}
      <div className="flex border-b border-[#232830] mb-6 overflow-x-auto scrollbar-none gap-2 pb-px">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 focus:outline-none focus:text-white ${
                isActive 
                  ? 'border-blue-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="text-xs">{cat !== 'All categories' ? getCategoryIcon(cat) : '📂'}</span>
              {cat}
            </button>
          );
        })}
      </div>

      {/* Filter, Search, and Sort Controls */}
      <div className="bg-[#14171C] border border-[#232830] rounded-t-lg p-4 flex flex-col md:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Search discussions..."
            className="w-full pl-10 pr-4 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort */}
        <div className="relative w-full md:w-auto">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="w-full md:w-auto px-4 py-2 text-sm font-semibold bg-[#21262D] hover:bg-[#30363D] rounded-md border border-[#30363D] flex items-center justify-between md:justify-start gap-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span>Sort: {
              sortBy === 'recently_active' ? 'Most recent activity' :
              sortBy === 'newest' ? 'Newest' : 'Most replies'
            }</span>
            <span>▾</span>
          </button>

          {sortDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 py-1">
              <div className="px-3 py-1 text-xs text-gray-500 border-b border-[#30363D]">Sort options</div>
              <button
                onClick={() => { setSortBy('recently_active'); setSortDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-blue-600 hover:text-white"
              >
                Most recent activity
              </button>
              <button
                onClick={() => { setSortBy('newest'); setSortDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-blue-600 hover:text-white"
              >
                Newest
              </button>
              <button
                onClick={() => { setSortBy('most_replied'); setSortDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-blue-600 hover:text-white"
              >
                Most replies
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#14171C] border-x border-b border-[#232830] rounded-b-lg overflow-hidden">
        {isLoading && (
          <div className="p-8 flex flex-col gap-4">
            <div className="h-12 bg-[#1C2128] rounded animate-pulse w-full"></div>
            <div className="h-12 bg-[#1C2128] rounded animate-pulse w-full"></div>
            <div className="h-12 bg-[#1C2128] rounded animate-pulse w-full"></div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-500">
            <span>⚠️</span> Error loading discussions: {error}
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Pinned section first */}
            {pinnedDiscussions.length > 0 && (
              <div className="bg-[#1C2128]/20 border-b border-[#232830]">
                <div className="px-4 py-2 text-xs font-semibold text-blue-400 flex items-center gap-1 border-b border-[#232830]/50 bg-[#1C2128]/40">
                  <span>📌</span> Pinned Discussions
                </div>
                {pinnedDiscussions.map(d => renderDiscussionRow(d, true))}
              </div>
            )}

            {/* Regular discussions section */}
            {discussions.length > 0 ? (
              <div>
                {discussions.map(d => renderDiscussionRow(d, false))}
              </div>
            ) : (
              pinnedDiscussions.length === 0 && (
                <div className="p-16 text-center text-gray-500">
                  <span className="text-4xl">💬</span>
                  {selectedCategory !== 'All categories' ? (
                    <>
                      <h3 className="text-lg font-semibold text-white mt-4">No discussions in this category yet</h3>
                      <p className="text-sm mt-1">Be the first to start a conversation in "{selectedCategory}".</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-white mt-4">No discussions in this repository yet</h3>
                      <p className="text-sm mt-1">Start a discussion to ask questions or share updates with the project community.</p>
                    </>
                  )}
                  <Link
                    href={`/${owner}/${repo}/discussions/new`}
                    className="mt-4 inline-block px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors"
                  >
                    Start a discussion
                  </Link>
                </div>
              )
            )}

            {/* Pagination Load More */}
            {nextCursor && (
              <div className="p-4 text-center border-t border-[#232830] bg-[#0E1116]/50">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 text-xs font-semibold bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Load more discussions
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
