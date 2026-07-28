'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReviewSubmitPanel from '@/components/pr/ReviewSubmitPanel';
import MergeActionArea from '@/components/pr/MergeActionArea';

const CodeDiffEditor = dynamic(
  () => import('@/components/editor/CodeEditor').then((mod) => mod.CodeDiffEditor),
  { ssr: false }
);

interface Commit {
  hash: string;
  message: string;
  authorName: string;
  date: string;
}

interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  originalContent?: string;
  modifiedContent?: string;
}

interface PRDetail {
  id: string;
  number: number;
  title: string;
  body: string;
  status: 'OPEN' | 'DRAFT' | 'MERGED' | 'CLOSED';
  baseBranch: string;
  compareBranch: string;
  creator: {
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  comments: any[];
}

export default function PullRequestDetailPage({ params }: { params: Promise<{ owner: string; repo: string; number: string }> }) {
  const { owner, repo, number } = use(params);
  const router = useRouter();

  const [pr, setPr] = useState<PRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'conversation' | 'commits' | 'files' | 'checks'>('conversation');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [loadingDiffs, setLoadingDiffs] = useState(false);

  const [newCommentBody, setNewCommentBody] = useState('');
  const [currentUser, setCurrentUser] = useState('appi');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Get current user context
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetch('/api/v1/user', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.username) setCurrentUser(data.username);
        })
        .catch(() => {});
    }
  }, []);

  const handleAddComment = async () => {
    if (!newCommentBody.trim() || !pr) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: newCommentBody, username: currentUser }),
      });
      if (res.ok) {
        const comment = await res.json();
        setPr({
          ...pr,
          comments: [...pr.comments, comment],
        });
        setNewCommentBody('');
      }
    } catch (e) {}
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !pr) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: editingCommentText, username: currentUser }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPr({
          ...pr,
          comments: pr.comments.map(c => c.id === commentId ? updated : c),
        });
        setEditingCommentId(null);
        setEditingCommentText('');
      }
    } catch (e) {}
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!pr) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: currentUser }),
      });
      if (res.ok) {
        setPr({
          ...pr,
          comments: pr.comments.filter(c => c.id !== commentId),
        });
      }
    } catch (e) {}
  };

  // Fetch PR detail on mount
  useEffect(() => {
    async function loadPR() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}`);
        if (!res.ok) throw new Error('Pull Request not found');
        const data = await res.json();
        setPr(data);
        setEditedTitle(data.title);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPR();
  }, [owner, repo, number]);

  // Fetch commits and files when switching tabs
  useEffect(() => {
    if (!pr) return;
    const { baseBranch, compareBranch } = pr;

    if (activeTab === 'commits' || activeTab === 'files') {
      async function loadComparison() {
        try {
          setLoadingDiffs(true);
          const res = await fetch(`/api/v1/repos/${owner}/${repo}/compare/${baseBranch}...${compareBranch}`);
          if (res.ok) {
            const data = await res.json();
            setCommits(data.commits || []);
            
            // Map comparison data diff structures to FileDiff
            const mappedFiles = await Promise.all((data.diff || []).map(async (f: any) => {
              // Optionally fetch original/modified content for the CodeDiffEditor if needed
              let originalContent = '';
              let modifiedContent = '';

              try {
                // Fetch file contents from git ref
                const origRes = await fetch(`/api/v1/repos/${owner}/${repo}/blob/${baseBranch}/${f.oldPath || f.newPath}`);
                if (origRes.ok) {
                  const origData = await origRes.json();
                  originalContent = origData.content || '';
                }
              } catch (e) {}

              try {
                const modRes = await fetch(`/api/v1/repos/${owner}/${repo}/blob/${compareBranch}/${f.newPath}`);
                if (modRes.ok) {
                  const modData = await modRes.json();
                  modifiedContent = modData.content || '';
                }
              } catch (e) {}

              return {
                path: f.newPath,
                status: f.status,
                additions: f.additions || 0,
                deletions: f.deletions || 0,
                originalContent,
                modifiedContent,
              };
            }));
            setFiles(mappedFiles);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingDiffs(false);
        }
      }
      loadComparison();
    }
  }, [pr, activeTab, owner, repo]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || !pr) return;
    try {
      setIsSavingTitle(true);
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editedTitle }),
      });
      if (res.ok) {
        setPr({ ...pr, title: editedTitle });
        setIsEditingTitle(false);
      }
    } catch (e) {
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleReadyForReview = async () => {
    if (!pr) return;
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OPEN' }),
      });
      if (res.ok) {
        setPr({ ...pr, status: 'OPEN' });
      }
    } catch (e) {}
  };

  const handleConvertToDraft = async () => {
    if (!pr) return;
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT' }),
      });
      if (res.ok) {
        setPr({ ...pr, status: 'DRAFT' });
      }
    } catch (e) {}
  };

  // Helper parser for Closes #N
  const getLinkedIssues = (text: string) => {
    const regex = /(?:closes|fixes|resolves)\s+#(\d+)/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return Array.from(new Set(matches));
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse font-space-grotesk">Loading pull request...</div>;
  }

  if (error || !pr) {
    return (
      <div className="p-8 text-center text-red-400 font-space-grotesk">
        Error: {error || 'Pull Request could not be loaded.'}
      </div>
    );
  }

  const linkedIssues = getLinkedIssues(pr.body);
  const openBadgeColor = pr.status === 'OPEN' ? 'bg-[#7C5CFF]/20 text-[#7C5CFF] border-[#7C5CFF]/30' : 
                          pr.status === 'DRAFT' ? 'bg-gray-800 text-gray-400 border-gray-700' :
                          pr.status === 'MERGED' ? 'bg-green-950/40 text-green-400 border-green-500/30' :
                          'bg-red-950/40 text-red-400 border-red-500/30';

  return (
    <div className="flex flex-col gap-6 font-space-grotesk max-w-6xl mx-auto p-4 md:p-6 text-gray-200">
      
      {/* 1. Header Area */}
      <div className="flex flex-col gap-3 border-b border-[#232830] pb-5">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="bg-[#0B0D10] border border-[#232830] rounded px-3 py-1.5 text-lg font-bold text-gray-200 focus:outline-none focus:border-[#7C5CFF] w-full"
                />
                <button
                  disabled={isSavingTitle}
                  onClick={handleSaveTitle}
                  className="bg-[#7C5CFF] text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-opacity-90 transition shrink-0"
                >
                  Save
                </button>
                <button
                  onClick={() => { setIsEditingTitle(false); setEditedTitle(pr.title); }}
                  className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-100">{pr.title} <span className="text-gray-500 font-mono font-normal">#{pr.number}</span></h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xs text-[#7C5CFF] hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded uppercase tracking-wider ${openBadgeColor}`}>
            {pr.status}
          </span>

          {/* Draft toggle: Ready for review / Convert to draft */}
          {currentUser === pr.creator.username && (
            <>
              {pr.status === 'DRAFT' && (
                <button
                  onClick={handleReadyForReview}
                  className="px-3 py-1 text-[10px] font-bold rounded border border-green-500/40 bg-green-950/30 text-green-400 hover:bg-green-950/50 transition uppercase tracking-wider"
                >
                  Ready for review
                </button>
              )}
              {pr.status === 'OPEN' && (
                <button
                  onClick={handleConvertToDraft}
                  className="px-3 py-1 text-[10px] font-bold rounded border border-gray-600 bg-gray-800/60 text-gray-400 hover:bg-gray-700 transition uppercase tracking-wider"
                >
                  Convert to draft
                </button>
              )}
            </>
          )}

          <span className="text-gray-400">
            by <span className="font-semibold text-gray-300">{pr.creator.username}</span> · {new Date(pr.createdAt).toLocaleDateString()}
          </span>
          <span className="text-gray-500 font-mono">
            merge from <Link href={`/${owner}/${repo}/tree/${pr.compareBranch}`} className="text-[#7C5CFF] hover:underline bg-[#7C5CFF]/10 px-1.5 py-0.5 rounded">{pr.compareBranch}</Link> into <Link href={`/${owner}/${repo}/tree/${pr.baseBranch}`} className="text-[#7C5CFF] hover:underline bg-[#7C5CFF]/10 px-1.5 py-0.5 rounded">{pr.baseBranch}</Link>
          </span>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div className="flex border-b border-[#232830] select-none text-xs gap-4">
        {(['conversation', 'commits', 'files', 'checks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 font-bold uppercase transition-all ${
              activeTab === tab 
                ? 'border-[#7C5CFF] text-[#7C5CFF]' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'files' ? 'Files changed' : tab}
          </button>
        ))}
      </div>

      {/* 3. Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Workspace Panels */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Tab 1: Conversation */}
          {activeTab === 'conversation' && (
            <div className="flex flex-col gap-6">
              {/* Initial PR body */}
              <div className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden">
                <div className="bg-[#14171C]/50 px-4 py-3 border-b border-[#232830] flex items-center justify-between text-xs text-gray-400">
                  <span className="font-bold text-gray-300">{pr.creator.username} commented</span>
                  <span>{new Date(pr.createdAt).toLocaleString()}</span>
                </div>
                <div className="p-4 text-sm text-gray-300 font-sans leading-relaxed whitespace-pre-wrap">
                  {pr.body || <span className="italic text-gray-500">No description provided.</span>}
                </div>
              </div>

              {/* Timeline comments */}
              <div className="flex flex-col gap-4">
                {pr.comments.map(comment => {
                  const isCommentAuthor = currentUser === comment.user.username;
                  const isEditing = editingCommentId === comment.id;

                  // Render review events differently if body contains prefix
                  const isReviewEvent = comment.body.startsWith('[Review:');

                  return (
                    <div key={comment.id} className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden ml-4">
                      <div className="bg-[#14171C]/50 px-4 py-2 border-b border-[#232830] flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-bold text-gray-300">
                          {isReviewEvent ? 'System' : comment.user.username} {isReviewEvent ? 'posted a status change' : 'commented'}
                        </span>
                        <div className="flex items-center gap-3">
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                          {!isReviewEvent && isCommentAuthor && !isEditing && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.body);
                                }}
                                className="text-blue-400 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-3 text-xs text-gray-300">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              rows={2}
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full bg-[#0B0D10] border border-[#232830] rounded p-2 text-xs text-gray-200 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2 text-[10px]">
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                className="bg-[#7C5CFF] text-white px-2.5 py-1 rounded font-semibold hover:bg-opacity-90 transition"
                              >
                                Update
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText('');
                                }}
                                className="bg-gray-800 text-gray-300 px-2.5 py-1 rounded hover:bg-gray-700 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-sans leading-relaxed whitespace-pre-wrap">
                            {comment.body}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comment Composer */}
              <div className="border border-[#232830] rounded-lg bg-[#0B0D10] p-4 flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase">Add a comment</span>
                <textarea
                  rows={4}
                  placeholder="Leave a comment..."
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                  className="bg-[#0B0D10] border border-[#232830] rounded p-2.5 text-xs text-gray-200 focus:outline-none focus:border-[#7C5CFF]"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newCommentBody.trim()}
                  className="self-end bg-[#7C5CFF] text-white py-1.5 px-4 rounded text-xs font-semibold hover:bg-opacity-90 disabled:opacity-50 transition"
                >
                  Comment
                </button>
              </div>

              {/* Merge Gating / Action Area */}
              <MergeActionArea
                owner={owner}
                repo={repo}
                prNumber={pr.number}
                pr={pr}
                onMergeSuccess={() => {
                  fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}`)
                    .then(res => res.json())
                    .then(data => setPr(data));
                }}
              />
            </div>
          )}

          {/* Tab 2: Commits */}
          {activeTab === 'commits' && (
            <div className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#232830] bg-[#14171C]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
                PR Commits
              </div>
              {loadingDiffs ? (
                <div className="p-8 text-center text-xs text-gray-500 animate-pulse">Loading commits...</div>
              ) : commits.length > 0 ? (
                <div className="divide-y divide-[#232830]">
                  {commits.map((commit) => (
                    <div key={commit.hash} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-gray-200 block">{commit.message}</span>
                        <span className="text-gray-500 mt-1 block">
                          by <span className="text-gray-400">{commit.authorName}</span> · {new Date(commit.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] bg-[#14171C] border border-[#232830] text-gray-400 px-2 py-0.5 rounded">
                        {commit.hash.slice(0, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 italic">No commits in this branch.</div>
              )}
            </div>
          )}

          {/* Tab 3: Files changed */}
          {activeTab === 'files' && (
            <div className="flex flex-col gap-6">
              {loadingDiffs ? (
                <div className="p-12 text-center text-xs text-gray-500 animate-pulse">Comparing file revisions...</div>
              ) : files.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    {files.map(file => (
                      <div key={file.path} className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden">
                        <div className="bg-[#14171C]/50 px-4 py-2.5 flex items-center justify-between border-b border-[#232830]">
                          <span className="font-mono text-xs text-gray-300">{file.path}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            file.status === 'added' ? 'text-green-400 bg-green-950/20' : 
                            file.status === 'deleted' ? 'text-red-400 bg-red-950/20' : 
                            'text-[#7C5CFF] bg-[#7C5CFF]/20'
                          }`}>
                            {file.status}
                          </span>
                        </div>
                        
                        <div className="p-3 bg-[#0B0D10]">
                          <CodeDiffEditor
                            original={file.originalContent || ''}
                            modified={file.modifiedContent || ''}
                            filename={file.path}
                            inline={false}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Submit PR Review Panel */}
                  <div className="border-t border-[#232830] pt-6">
                    <ReviewSubmitPanel
                      owner={owner}
                      repo={repo}
                      prNumber={pr.number}
                      isAuthor={currentUser === pr.creator.username}
                      onSubmitSuccess={() => {
                        // Reload PR data to pull in new review comments
                        fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${number}`)
                          .then(res => res.json())
                          .then(data => setPr(data));
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 italic">No files modified.</div>
              )}
            </div>
          )}

          {/* Tab 4: Checks */}
          {activeTab === 'checks' && (
            <div className="p-12 border border-dashed border-[#232830] rounded-lg bg-[#0B0D10] text-center text-gray-500 italic text-sm">
              CI checks integration is not yet available for this repository.
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          {/* Reviewers */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Reviewers</span>
            <div className="text-xs text-gray-500 italic">No reviewers requested yet.</div>
          </div>

          {/* Assignees */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Assignees</span>
            <div className="text-xs text-gray-300 font-semibold">{pr.creator.username}</div>
          </div>

          {/* Labels */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Labels</span>
            <div className="text-xs text-gray-500 italic">None</div>
          </div>

          {/* Linked Issues */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Linked Issues</span>
            {linkedIssues.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {linkedIssues.map(num => (
                  <span key={num} className="text-xs text-[#9E85FF] font-mono">
                    Closes #{num}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">None</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
