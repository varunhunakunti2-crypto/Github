'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Branch {
  name: string;
}

interface Commit {
  hash: string;
  message: string;
  authorName: string;
  date: string;
}

interface Collaborator {
  username: string;
}

export default function NewPullRequestPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [branches, setBranches] = useState<string[]>([]);
  const [baseBranch, setBaseBranch] = useState(searchParams.get('base') || 'main');
  const [headBranch, setHeadBranch] = useState(searchParams.get('head') || '');

  const [commits, setCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [suggestedReviewers, setSuggestedReviewers] = useState<string[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [reviewerInput, setReviewerInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch branches list
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/branches`);
        if (res.ok) {
          const list = await res.json();
          setBranches(list.map((b: Branch) => b.name));
          if (!headBranch && list.length > 0) {
            const firstNonBase = list.find((b: Branch) => b.name !== baseBranch);
            setHeadBranch(firstNonBase ? firstNonBase.name : list[0].name);
          }
        }
      } catch (e) {}
    }
    loadBranches();
  }, [owner, repo, baseBranch, headBranch]);

  // Fetch collaborators for reviewers autocomplete
  useEffect(() => {
    async function loadCollaborators() {
      try {
        // Fallback to mock collaborators if API does not exist
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/collaborators`);
        if (res.ok) {
          const list = await res.json();
          setCollaborators(list.map((c: Collaborator) => c.username));
        } else {
          setCollaborators(['appi', 'someone_else', 'reviewer-one', 'reviewer-two']);
        }
      } catch (e) {
        setCollaborators(['appi', 'someone_else', 'reviewer-one', 'reviewer-two']);
      }
    }
    loadCollaborators();
  }, [owner, repo]);

  // Fetch comparison commits and trigger CODEOWNERS logic
  useEffect(() => {
    if (!baseBranch || !headBranch || baseBranch === headBranch) {
      setCommits([]);
      return;
    }

    async function loadComparison() {
      try {
        setLoadingCommits(true);
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/compare/${baseBranch}...${headBranch}`);
        if (res.ok) {
          const data = await res.json();
          setCommits(data.commits || []);
          
          // Default title logic: if only 1 commit, use its message
          if (data.commits && data.commits.length === 1) {
            setTitle(data.commits[0].message);
          } else {
            setTitle('');
          }

          // Simple mock CODEOWNERS check: if diff contains certain patterns, suggest specific teams/reviewers
          const files = data.diff || [];
          const suggestions = new Set<string>();
          files.forEach((f: any) => {
            if (f.newPath.endsWith('.ts') || f.newPath.endsWith('.tsx')) {
              suggestions.add('reviewer-one');
            }
            if (f.newPath.startsWith('backend/')) {
              suggestions.add('someone_else');
            }
          });
          setSuggestedReviewers(Array.from(suggestions));
        }
      } catch (e) {
        setCommits([]);
      } finally {
        setLoadingCommits(false);
      }
    }
    loadComparison();
  }, [owner, repo, baseBranch, headBranch]);

  const handleSelectReviewer = (username: string) => {
    if (!selectedReviewers.includes(username)) {
      setSelectedReviewers([...selectedReviewers, username]);
    }
    setReviewerInput('');
  };

  const handleRemoveReviewer = (username: string) => {
    setSelectedReviewers(selectedReviewers.filter(r => r !== username));
  };

  // Live issue link/close parsing
  const getLinkedIssues = () => {
    const regex = /(?:closes|closes|fixes|resolves)\s+#(\d+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
      matches.push(match[1]);
    }
    return Array.from(new Set(matches));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Title is required');
      return;
    }
    if (baseBranch === headBranch) {
      setError('Base and head branches cannot be identical');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          base: baseBranch,
          head: headBranch,
          draft: isDraft,
          reviewers: selectedReviewers,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create pull request');
      }

      const pr = await res.json();
      router.push(`/${owner}/${repo}/pull/${pr.number}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const linkedIssues = getLinkedIssues();
  const filteredCollaborators = collaborators.filter(
    c => c.toLowerCase().includes(reviewerInput.toLowerCase()) && !selectedReviewers.includes(c)
  );

  return (
    <div className="flex flex-col gap-6 font-sans max-w-5xl mx-auto p-4 md:p-6 text-gray-200">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Open a Pull Request</h2>
        <p className="text-xs text-gray-500 mt-1">Create a new pull request to merge changes from a feature branch.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
          {error}
        </div>
      )}

      {/* Selectors */}
      <div className="flex items-center gap-4 bg-[#14171C] p-4 border border-[#232830] rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase">Base:</span>
          <select
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-1.5 rounded focus:outline-none font-mono cursor-pointer"
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <span className="text-gray-500">←</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase">Head:</span>
          <select
            value={headBranch}
            onChange={(e) => setHeadBranch(e.target.value)}
            className="bg-[#0B0D10] border border-[#232830] text-gray-200 px-3 py-1.5 rounded focus:outline-none font-mono cursor-pointer"
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {baseBranch === headBranch ? (
        <div className="p-12 border border-[#232830] rounded-lg bg-[#0B0D10] text-center text-gray-500 italic text-sm">
          Cannot compare identical branches. Please choose a different head branch.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">PR Title</label>
              <input
                type="text"
                placeholder={commits.length > 1 ? 'Summarize your changes...' : 'PR Title'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#0B0D10] border border-[#232830] rounded px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#7C5CFF]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Description (Markdown)</label>
              <textarea
                rows={8}
                placeholder="Describe what this PR changes..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="bg-[#0B0D10] border border-[#232830] rounded p-3 text-sm text-gray-200 focus:outline-none focus:border-[#7C5CFF] font-sans"
              />
            </div>

            {/* Live Link Preview */}
            {linkedIssues.length > 0 && (
              <div className="bg-[#14171C]/50 border border-[#232830] rounded p-3 text-xs">
                <span className="text-gray-400 font-bold uppercase block mb-1">Linked Issues</span>
                <div className="flex flex-wrap gap-2">
                  {linkedIssues.map(num => (
                    <span key={num} className="bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#9E85FF] px-2 py-0.5 rounded font-mono">
                      Closes #{num}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-3 bg-[#14171C]/30 border border-[#232830] rounded">
              <input
                type="checkbox"
                id="draft-checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="mt-1"
              />
              <div className="flex flex-col text-xs">
                <label htmlFor="draft-checkbox" className="font-bold text-gray-300 cursor-pointer">
                  Create as Draft PR
                </label>
                <span className="text-gray-500 mt-0.5">
                  Draft PRs are not open for official review and cannot be merged, but CI tests and diff comparison still run.
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingCommits || commits.length === 0}
              className="bg-[#7C5CFF] text-white py-2.5 px-4 rounded text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Creating pull request...' : 'Create pull request'}
            </button>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
            {/* Reviewers Picker */}
            <div className="bg-[#14171C] border border-[#232830] rounded-lg p-4 flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Reviewers</span>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter collaborators..."
                  value={reviewerInput}
                  onChange={(e) => setReviewerInput(e.target.value)}
                  className="w-full bg-[#0B0D10] border border-[#232830] rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                />
                {reviewerInput && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0B0D10] border border-[#232830] rounded shadow-lg max-h-40 overflow-y-auto z-10">
                    {filteredCollaborators.length > 0 ? (
                      filteredCollaborators.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSelectReviewer(c)}
                          className="w-full text-left px-3 py-2 hover:bg-[#1C2026] text-xs text-gray-300"
                        >
                          {c}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500 italic">No matches</div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Reviewers */}
              {selectedReviewers.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {selectedReviewers.map(r => (
                    <div key={r} className="flex items-center justify-between bg-[#0B0D10] border border-[#232830] rounded px-2 py-1 text-xs">
                      <span>{r}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveReviewer(r)}
                        className="text-red-400 hover:text-red-300 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Reviewers (CODEOWNERS) */}
              {suggestedReviewers.length > 0 && (
                <div className="border-t border-[#232830] pt-2 mt-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Suggested Reviewers</span>
                  <div className="flex flex-col gap-1">
                    {suggestedReviewers
                      .filter(r => !selectedReviewers.includes(r))
                      .map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleSelectReviewer(r)}
                          className="text-left text-xs text-blue-400 hover:underline flex items-center justify-between"
                        >
                          <span>{r}</span>
                          <span className="text-[9px] bg-blue-950/20 text-[#7C5CFF] border border-[#7C5CFF]/30 px-1 rounded uppercase">Codeowner</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Commits List Snippet */}
            <div className="bg-[#14171C]/50 border border-[#232830] rounded-lg p-4 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Commits ({commits.length})</span>
              {loadingCommits ? (
                <div className="text-xs text-gray-500 animate-pulse">Loading commits...</div>
              ) : commits.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto font-mono text-[10px]">
                  {commits.map(c => (
                    <div key={c.hash} className="truncate text-gray-300" title={c.message}>
                      <span className="text-[#7C5CFF] mr-1">{c.hash.slice(0, 7)}</span> {c.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">No commits to compare</div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
