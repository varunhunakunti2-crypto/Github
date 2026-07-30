'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Author {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface PollOption {
  id: string;
  text: string;
  position: number;
  voteCount: number;
  userVoted: boolean;
}

interface Comment {
  id: string;
  body: string;
  userId: string;
  user: Author;
  isEvent: boolean;
  eventType: string | null;
  createdAt: string;
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
  answeredComment: Comment | null;
  isPinned: boolean;
  allowMultiplePollVotes: boolean;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  pollOptions: PollOption[];
  totalVotes: number;
}

export default function DiscussionDetailPage() {
  const { owner, repo, number } = useParams() as { owner: string; repo: string; number: string };

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editBody, setEditBody] = useState('');

  // Comment state
  const [newCommentBody, setNewCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Toast / Status banner state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUser = 'appi'; // Local mockup user

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const loadDiscussion = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/${number}?userId=${currentUser}`);
      if (!res.ok) throw new Error('Failed to fetch discussion details');
      const data = await res.json();
      setDiscussion(data);
      setEditTitle(data.title);
      setEditBody(data.body);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Discussion not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiscussion();
  }, [owner, repo, number]);

  const handleUpdateDiscussion = async (fields: { title?: string; body?: string; isPinned?: boolean }) => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/${number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, username: currentUser }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update discussion');
      }
      const updated = await res.json();
      setDiscussion(updated);
      setIsEditingTitle(false);
      setIsEditingBody(false);
      if (fields.isPinned !== undefined) {
        showToast(fields.isPinned ? 'Discussion pinned successfully!' : 'Discussion unpinned successfully!');
      } else {
        showToast('Discussion updated successfully!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to apply update');
    }
  };

  const handleVote = async (optionId: string) => {
    if (!discussion) return;
    try {
      // Toggle logic or direct call
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/${number}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: [optionId], username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to submit vote');
      const updated = await res.json();
      setDiscussion(updated);
      showToast('Vote registered!');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit vote');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || !discussion) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/${number}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newCommentBody, username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to add reply');
      const newComment = await res.json();
      setDiscussion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: [...prev.comments, newComment]
        };
      });
      setNewCommentBody('');
      showToast('Reply posted!');
    } catch (err: any) {
      showToast(err.message || 'Failed to post reply');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editingCommentText, username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to update reply');
      const updatedComment = await res.json();
      setDiscussion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.map(c => c.id === commentId ? { ...c, body: updatedComment.body } : c)
        };
      });
      setEditingCommentId(null);
      setEditingCommentText('');
      showToast('Reply updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update reply');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
      });
      if (!res.ok) throw new Error('Failed to delete reply');
      setDiscussion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.filter(c => c.id !== commentId),
          answeredCommentId: prev.answeredCommentId === commentId ? null : prev.answeredCommentId,
          answeredComment: prev.answeredComment?.id === commentId ? null : prev.answeredComment
        };
      });
      showToast('Reply deleted!');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete reply');
    }
  };

  const handleMarkAsAnswer = async (commentId: string | null) => {
    if (!discussion) return;
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/discussions/${number}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, username: currentUser })
      });
      if (!res.ok) throw new Error('Failed to update answer selection');
      const updated = await res.json();
      setDiscussion(updated);
      showToast(commentId ? 'Marked as best answer!' : 'Unmarked answer!');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark answer');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 text-center text-gray-500 animate-pulse">
        <div className="h-8 bg-[#1C2128] rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-[#1C2128] rounded w-full"></div>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="py-16 text-center text-gray-500">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-lg font-semibold text-white mt-2 font-geist">Discussion not found</h3>
        <p className="text-sm mt-1">{error || 'The discussion you are looking for does not exist.'}</p>
        <Link href={`/${owner}/${repo}/discussions`} className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Discussions
        </Link>
      </div>
    );
  }

  const isAuthor = discussion.author.username === currentUser;
  const isQA = discussion.category === 'Q&A';
  const hasPoll = discussion.pollOptions && discussion.pollOptions.length > 0;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 text-gray-300 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1F2937] border border-[#374151] px-4 py-2.5 rounded-md text-sm text-white shadow-xl flex items-center gap-2 animate-fade-in font-medium">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-1">
        <Link href={`/${owner}/${repo}/discussions`} className="hover:underline hover:text-gray-300">
          Discussions
        </Link>
        <span>/</span>
        <span className="text-gray-300 font-mono">#{discussion.number}</span>
      </div>

      {/* Discussion Header */}
      <div className="border-b border-[#232830] pb-5 mb-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          {isEditingTitle ? (
            <div className="flex gap-2 items-center flex-1">
              <input
                type="text"
                className="flex-1 px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white font-bold text-2xl focus:outline-none focus:border-blue-500"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <button
                onClick={() => handleUpdateDiscussion({ title: editTitle })}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded text-sm text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5 flex-wrap">
                <span>{discussion.title}</span>
                <span className="text-gray-500 font-normal">#{discussion.number}</span>
              </h1>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-blue-800 bg-blue-950/60 text-blue-400">
              {discussion.category}
            </span>
            <button
              onClick={() => handleUpdateDiscussion({ isPinned: !discussion.isPinned })}
              className={`px-3 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                discussion.isPinned
                  ? 'bg-blue-950/40 border-blue-500 text-blue-400'
                  : 'bg-[#21262D] hover:bg-[#30363D] border-[#30363D] text-gray-400'
              }`}
            >
              📌 {discussion.isPinned ? 'Pinned' : 'Pin'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap text-sm text-gray-500">
          <span className="font-semibold text-gray-400">@{discussion.author.username}</span>
          <span>started this discussion on {new Date(discussion.createdAt).toLocaleDateString()}</span>
          <span>•</span>
          <span>{discussion.comments.length} replies</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Post + Poll + Replies */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Post Description Body */}
          <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
            <div className="bg-[#0E1116] px-4 py-2 border-b border-[#232830] flex justify-between items-center text-xs">
              <span className="font-bold text-white">Original post</span>
              {isAuthor && !isEditingBody && (
                <button
                  onClick={() => setIsEditingBody(true)}
                  className="text-blue-500 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {isEditingBody ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    rows={6}
                    className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleUpdateDiscussion({ body: editBody })}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                    >
                      Save description
                    </button>
                    <button
                      onClick={() => setIsEditingBody(false)}
                      className="px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                discussion.body || <span className="italic text-gray-500">No description provided.</span>
              )}
            </div>
          </div>

          {/* Poll Display */}
          {hasPoll && (
            <div className="border border-[#232830] rounded-lg bg-[#14171C] p-5">
              <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Poll</h2>
              <div className="flex flex-col gap-4">
                {discussion.pollOptions.map((opt) => {
                  const percent = discussion.totalVotes > 0 ? Math.round((opt.voteCount / discussion.totalVotes) * 100) : 0;
                  return (
                    <div key={opt.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVote(opt.id)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              opt.userVoted
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-[#1C2128] border-[#30363D] text-gray-400 hover:text-white'
                            }`}
                          >
                            {opt.userVoted ? '✓ Voted' : 'Vote'}
                          </button>
                          <span className={opt.userVoted ? 'text-white font-semibold' : 'text-gray-300'}>
                            {opt.text}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-semibold">
                          {opt.voteCount} votes ({percent}%)
                        </span>
                      </div>

                      {/* Vote percent bar */}
                      <div className="w-full h-2.5 bg-[#1C2128] rounded-full overflow-hidden border border-[#30363D]/65">
                        <div
                          className={`h-full transition-all duration-300 ${opt.userVoted ? 'bg-blue-500' : 'bg-gray-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-4 font-semibold text-right">
                Total votes: {discussion.totalVotes}
              </div>
            </div>
          )}

          {/* Pinned Best Answer (Q&A Category only) */}
          {isQA && discussion.answeredComment && (
            <div className="border border-green-800 rounded-lg bg-green-950/20 overflow-hidden">
              <div className="bg-green-900/30 px-4 py-2 border-b border-green-800 flex justify-between items-center text-xs">
                <span className="font-bold text-green-400 flex items-center gap-1">
                  ✓ Best Answer
                </span>
                <span className="text-green-500 text-[10px] font-semibold">
                  Chosen by the author
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <span className="font-bold text-white">@{discussion.answeredComment.user.username}</span>
                  <span>replied on {new Date(discussion.answeredComment.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {discussion.answeredComment.body}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <a href={`#comment-${discussion.answeredComment.id}`} className="text-xs text-green-400 hover:underline">
                    Go to reply
                  </a>
                  {isAuthor && (
                    <button
                      onClick={() => handleMarkAsAnswer(null)}
                      className="text-xs text-red-400 hover:underline focus:outline-none"
                    >
                      Unmark answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Replies Stream header */}
          <div className="border-b border-[#232830] pb-2 mt-4">
            <h3 className="text-lg font-semibold text-white">
              Replies ({discussion.comments.length})
            </h3>
          </div>

          {/* Replies Stream */}
          <div className="flex flex-col gap-4">
            {discussion.comments.length > 0 ? (
              discussion.comments.map((comment) => {
                const isCommentAuthor = comment.user.username === currentUser;
                const isEditing = editingCommentId === comment.id;
                const isAnswer = discussion.answeredCommentId === comment.id;

                return (
                  <div
                    id={`comment-${comment.id}`}
                    key={comment.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isAnswer 
                        ? 'border-green-800 bg-green-950/10'
                        : 'border-[#232830] bg-[#14171C]'
                    }`}
                  >
                    {/* Comment header */}
                    <div className={`px-4 py-2 border-b flex justify-between items-center text-xs ${
                      isAnswer ? 'border-green-800 bg-green-900/20' : 'border-[#232830] bg-[#0E1116]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">@{comment.user.username}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        {isAnswer && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-950/80 text-green-400 border border-green-800">
                            ✓ Answer
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-3 items-center">
                        {isQA && (isAuthor || currentUser === 'appi') && (
                          <button
                            onClick={() => handleMarkAsAnswer(isAnswer ? null : comment.id)}
                            className="text-xs text-green-400 hover:underline focus:outline-none"
                          >
                            {isAnswer ? 'Unmark answer' : 'Mark as answer'}
                          </button>
                        )}

                        {isCommentAuthor && !isEditing && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.body);
                              }}
                              className="text-blue-500 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comment Body */}
                    <div className="p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            rows={4}
                            className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleUpdateComment(comment.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCommentId(null)}
                              className="px-3 py-1 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded text-xs text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        comment.body
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500 border border-dashed border-[#232830] rounded-lg">
                No replies yet. Start the conversation by replying below!
              </div>
            )}
          </div>

          {/* Reply Composer */}
          <div className="border border-[#232830] rounded-lg bg-[#14171C] p-4 mt-4">
            <h4 className="text-sm font-semibold text-white mb-3">Add a reply</h4>
            <form onSubmit={handleAddComment} className="flex flex-col gap-3">
              <textarea
                placeholder="Write your response, markdown allowed..."
                rows={4}
                className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
                value={newCommentBody}
                onChange={(e) => setNewCommentBody(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {isSubmittingComment ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info/Actions */}
        <div className="flex flex-col gap-4 border border-[#232830] rounded-lg bg-[#14171C] p-4 text-xs">
          <div>
            <h3 className="font-semibold text-white mb-1">Details</h3>
            <p className="text-gray-500">
              Only members of the repository team with maintainer role can pin discussions or edit settings.
            </p>
          </div>

          <div className="border-t border-[#232830] pt-3">
            <h4 className="font-semibold text-white mb-1.5">Category description</h4>
            <p className="text-gray-500 leading-relaxed">
              {discussion.category === 'Q&A' && 'This is a Q&A discussion. The author or maintainers can mark a reply as the correct answer.'}
              {discussion.category === 'Ideas' && 'Use this category to suggest and brainstorm ideas.'}
              {discussion.category === 'Announcements' && 'Broadcasting major updates and details.'}
              {discussion.category === 'General' && 'General discussions about the project.'}
              {discussion.category === 'Show and tell' && 'Show off your work and interesting demos.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
