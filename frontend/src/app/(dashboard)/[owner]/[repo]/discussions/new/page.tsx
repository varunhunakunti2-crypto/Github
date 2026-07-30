'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface CategoryConfig {
  name: string;
  icon: string;
  description: string;
  allowsPoll: boolean;
}

const CATEGORIES: CategoryConfig[] = [
  {
    name: 'Q&A',
    icon: '🙋',
    description: 'Ask the community a question, get answers, and mark the best reply as the solution.',
    allowsPoll: false,
  },
  {
    name: 'Ideas',
    icon: '💡',
    description: 'Share and discuss ideas for new features, improvements, or new directions.',
    allowsPoll: true,
  },
  {
    name: 'Announcements',
    icon: '📢',
    description: 'Share news, updates, announcements, or general broadcasts with everyone.',
    allowsPoll: false,
  },
  {
    name: 'General',
    icon: '💬',
    description: 'Chat about anything else—conversations, questions, or just saying hello.',
    allowsPoll: true,
  },
  {
    name: 'Show and tell',
    icon: '🙌',
    description: 'Show off what you built, shared articles, tools, or anything cool.',
    allowsPoll: false,
  },
];

export default function NewDiscussionPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const router = useRouter();

  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  // Poll state
  const [hasPoll, setHasPoll] = useState<boolean>(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultiplePollVotes, setAllowMultiplePollVotes] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategoryConfig = CATEGORIES.find(c => c.name === category);

  const handleAddPollOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, idx) => idx !== index));
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: any = {
      category,
      title,
      body,
      username: 'appi' // Assumed local current user
    };

    if (hasPoll && selectedCategoryConfig?.allowsPoll) {
      // Filter out empty options
      const activeOptions = pollOptions.map(o => o.trim()).filter(Boolean);
      if (activeOptions.length < 2) {
        setError('Please provide at least 2 non-empty poll options');
        setIsSubmitting(false);
        return;
      }
      payload.pollOptions = activeOptions;
      payload.allowMultiplePollVotes = allowMultiplePollVotes;
    }

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create discussion');
      }

      const discussion = await res.json();
      router.push(`/${owner}/${repo}/discussions/${discussion.number}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 text-gray-300">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-1">
        <Link href={`/${owner}/${repo}/discussions`} className="hover:underline hover:text-gray-300">
          Discussions
        </Link>
        <span>/</span>
        <span className="text-gray-300">New discussion</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Start a new discussion</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-950/40 border border-red-800 rounded-md text-red-400 text-sm">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1: Select Category */}
        <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5">
          <label className="block text-sm font-semibold text-white mb-3">1. Select category (required)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.name;
              return (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => {
                    setCategory(cat.name);
                    setError(null);
                  }}
                  className={`text-left p-4 rounded-lg border transition-all flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-950/20 border-blue-500 text-white'
                      : 'bg-[#1C2128]/40 border-[#30363D] hover:border-gray-500'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{cat.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Content */}
        {category && (
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white mb-1">2. Compose your post</h3>
            
            {/* Title */}
            <div>
              <label htmlFor="discussion-title" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Title</label>
              <input
                id="discussion-title"
                type="text"
                placeholder="Be clear and descriptive..."
                className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Markdown Body */}
            <div>
              <div className="flex justify-between items-center mb-1.5 border-b border-[#232830] pb-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase">Body</label>
                <div className="flex rounded-md bg-[#1C2128] p-0.5 border border-[#30363D]">
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
                  placeholder="Supporting details, markdown allowed..."
                  rows={8}
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              ) : (
                <div className="p-4 bg-[#1C2128] border border-[#30363D] rounded-md min-h-[178px] text-sm text-gray-300 prose prose-invert max-w-none whitespace-pre-wrap">
                  {body || <span className="text-gray-500 italic">Nothing to preview.</span>}
                </div>
              )}
            </div>

            {/* Poll addition (Only if allowed) */}
            {selectedCategoryConfig?.allowsPoll && (
              <div className="mt-4 border-t border-[#232830] pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="toggle-poll"
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                      checked={hasPoll}
                      onChange={(e) => setHasPoll(e.target.checked)}
                    />
                    <label htmlFor="toggle-poll" className="text-sm font-semibold text-white cursor-pointer select-none">
                      Add a poll
                    </label>
                  </div>
                </div>

                {hasPoll && (
                  <div className="mt-4 p-4 bg-[#1C2128]/50 border border-[#232830] rounded-md flex flex-col gap-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase">Poll Options (Min 2)</label>
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-xs text-white focus:outline-none focus:border-blue-500"
                          value={opt}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          disabled={pollOptions.length <= 2}
                          className="px-2 py-1.5 text-xs text-red-500 hover:text-red-400 disabled:opacity-30 focus:outline-none"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="text-xs font-semibold text-blue-400 hover:underline focus:outline-none"
                      >
                        + Add option
                      </button>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="multiple-selections"
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                          checked={allowMultiplePollVotes}
                          onChange={(e) => setAllowMultiplePollVotes(e.target.checked)}
                        />
                        <label htmlFor="multiple-selections" className="text-xs text-gray-400 cursor-pointer select-none">
                          Allow multiple selections
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        {category && (
          <div className="flex gap-3 justify-end items-center">
            <Link
              href={`/${owner}/${repo}/discussions`}
              className="px-4 py-2 text-sm font-semibold border border-[#30363D] hover:bg-[#30363D] text-gray-300 rounded-md transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {isSubmitting ? 'Creating...' : 'Start discussion'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
