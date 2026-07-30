'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { WikiContext, WikiPageMeta } from './context';

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const pathname = usePathname();

  const [pages, setPages] = useState<WikiPageMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer toggle

  const loadPages = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages?username=appi`);
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      console.error('Error loading wiki pages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [owner, repo]);

  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isWriteAccess = true; // Assume true for local dev mockup

  return (
    <WikiContext.Provider value={{ pages, loadPages, isLoading }}>
      <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#232830] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl md:text-2xl font-bold text-white">Repository Wiki</h1>
          </div>
          <div className="flex items-center gap-3">
            {isWriteAccess && (
              <Link
                href={`/${owner}/${repo}/wiki/new-page-temp/edit`} // Redirects to new page slug edit
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-500 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                New page
              </Link>
            )}
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 border border-[#30363D] hover:bg-[#30363D] rounded text-white focus:outline-none"
              aria-label="Toggle Wiki Pages Sidebar"
            >
              ☰ Pages
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Sidebar Drawer on Mobile / Standard Column on Desktop */}
          <div
            className={`lg:col-span-1 border border-[#232830] rounded-lg bg-[#14171C] p-4 flex flex-col gap-4 transition-all duration-300 lg:block ${
              sidebarOpen ? 'block fixed inset-y-0 left-0 z-50 w-72 h-full border-r bg-[#14171C]' : 'hidden'
            }`}
          >
            {/* Sidebar title / Close (Mobile) */}
            <div className="flex justify-between items-center lg:hidden pb-2 border-b border-[#232830]">
              <span className="font-semibold text-white">Wiki Pages</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-gray-500">🔍</span>
              <input
                type="text"
                placeholder="Find a page..."
                className="w-full pl-8 pr-3 py-1 bg-[#1C2128] border border-[#30363D] rounded text-xs text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Pages List */}
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] mt-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Pages</span>
              {isLoading ? (
                <div className="text-xs text-gray-500 px-1 animate-pulse">Loading pages...</div>
              ) : filteredPages.length > 0 ? (
                filteredPages.map(p => {
                  const isActive = pathname === `/${owner}/${repo}/wiki/${p.slug}` || (p.slug === 'Home' && pathname === `/${owner}/${repo}/wiki`);
                  return (
                    <Link
                      key={p.slug}
                      href={`/${owner}/${repo}/wiki/${p.slug}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`px-2 py-1.5 rounded text-xs transition-colors hover:bg-[#1C2128] focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isActive ? 'bg-[#30363D] text-white font-semibold' : 'text-gray-400'
                      }`}
                    >
                      {p.slug === 'Home' ? '🏠 Home' : `📄 ${p.title}`}
                    </Link>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 px-1 italic">No pages found</div>
              )}
            </div>
          </div>

          {/* Main content pane */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </div>
    </WikiContext.Provider>
  );
}
