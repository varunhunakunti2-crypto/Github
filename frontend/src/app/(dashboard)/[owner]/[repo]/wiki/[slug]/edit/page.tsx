'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWiki } from '../../context';

export default function WikiEditPage() {
  const { owner, repo, slug } = useParams() as { owner: string; repo: string; slug: string };
  const { loadPages } = useWiki();
  const router = useRouter();

  const isNewPage = slug === 'new-page-temp';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const [isLoading, setIsLoading] = useState(!isNewPage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate slug dynamically from title
  const generatedSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .replace(/\s+/g, '-');        // replace spaces with dash

  useEffect(() => {
    // Beforeunload handler to protect unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (isNewPage) {
      setTitle('');
      setBody('');
      setCommitMessage('Create new page');
      return;
    }

    async function loadPage() {
      try {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${slug}?username=appi`);
        if (!res.ok) throw new Error('Failed to load page content');
        const data = await res.json();
        setTitle(data.title);
        setBody(data.body);
        setCommitMessage(`Update ${data.title}`);
      } catch (err: any) {
        setError(err.message || 'Page not found');
      } finally {
        setIsLoading(false);
      }
    }
    loadPage();
  }, [owner, repo, slug, isNewPage]);

  // Update default commit message when title changes (only if it wasn't manually customized)
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
    if (isNewPage) {
      setCommitMessage(`Create ${newTitle || 'new page'}`);
    } else {
      setCommitMessage(`Update ${newTitle || slug}`);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmLeave) {
        e.preventDefault();
        return;
      }
    }
    // Navigate back to slug page or wiki home
    if (isNewPage) {
      router.push(`/${owner}/${repo}/wiki`);
    } else {
      router.push(`/${owner}/${repo}/wiki/${slug}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const targetSlug = isNewPage ? generatedSlug : slug;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/wiki/pages/${targetSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          message: commitMessage,
          username: 'appi' // Mock current user
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save page');
      }

      setIsDirty(false);
      await loadPages(); // Reload layout list
      router.push(`/${owner}/${repo}/wiki/${targetSlug}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-[#232830] rounded-lg bg-[#14171C] p-8 text-center text-gray-500 animate-pulse">
        <div className="h-6 bg-[#1C2128] rounded w-1/3 mb-4"></div>
        <div className="h-40 bg-[#1C2128] rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
      <div className="bg-[#0E1116] px-5 py-3 border-b border-[#232830]">
        <h2 className="text-base font-bold text-white">
          {isNewPage ? 'Create new wiki page' : `Edit page: ${title}`}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 text-xs rounded-md">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Title Input */}
        <div>
          <label htmlFor="wiki-title" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Page Title</label>
          <input
            id="wiki-title"
            type="text"
            placeholder="e.g. Getting Started"
            className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
          />
          {isNewPage && title && (
            <div className="text-xs text-gray-500 mt-1 font-mono">
              Generated slug: <span className="text-blue-400">/wiki/{generatedSlug}</span>
            </div>
          )}
          {!isNewPage && (
            <div className="text-xs text-amber-500 mt-1">
              ⚠️ Note: Changing the title after creation may affect existing wiki internal links.
            </div>
          )}
        </div>

        {/* Compose Area */}
        <div>
          <div className="flex justify-between items-center mb-1.5 border-b border-[#232830] pb-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase">Page Body</label>
            <div className="flex rounded bg-[#1C2128] p-0.5 border border-[#30363D]">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1 text-xs font-medium rounded ${!previewMode ? 'bg-[#30363D] text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1 text-xs font-medium rounded ${previewMode ? 'bg-[#30363D] text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Preview
              </button>
            </div>
          </div>

          {!previewMode ? (
            <textarea
              placeholder="Write page content in markdown format..."
              rows={12}
              className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              value={body}
              onChange={(e) => { setBody(e.target.value); setIsDirty(true); }}
            />
          ) : (
            <div className="p-4 bg-[#1C2128] border border-[#30363D] rounded-md min-h-[266px] text-sm text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert">
              {body || <span className="text-gray-500 italic">Nothing to preview.</span>}
            </div>
          )}
        </div>

        {/* Commit Message Panel */}
        <div className="border-t border-[#232830] pt-4 mt-2">
          <label htmlFor="commit-message" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Commit Message</label>
          <input
            id="commit-message"
            type="text"
            className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
            value={commitMessage}
            onChange={(e) => { setCommitMessage(e.target.value); setIsDirty(true); }}
            required
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Every wiki page update is backed by a real Git commit history. A commit message is required.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 justify-end items-center border-t border-[#232830] pt-4 mt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold border border-[#30363D] hover:bg-[#30363D] text-gray-300 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {isSubmitting ? 'Saving...' : 'Save page'}
          </button>
        </div>
      </form>
    </div>
  );
}
