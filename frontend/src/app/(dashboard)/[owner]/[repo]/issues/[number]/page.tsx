'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEvent: boolean;
  eventType: string | null;
  eventMetadata: string | null;
  user: { id: string; username: string; avatarUrl: string | null };
}

interface Issue {
  id: string;
  number: number;
  title: string;
  body: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  creator: { username: string; avatarUrl: string | null };
  assignees: { id: string; username: string; avatarUrl: string | null }[];
  labels: { id: string; name: string; color: string; description: string | null }[];
  milestone: { id: string; title: string } | null;
  comments: Comment[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Milestone {
  id: string;
  title: string;
}

interface Collaborator {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Project {
  id: string;
  title: string;
}

export default function IssueDetailPage() {
  const { owner, repo, number } = useParams() as { owner: string; repo: string; number: string };
  const router = useRouter();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectBoard, setActiveProjectBoard] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [editBody, setEditBody] = useState('');

  // Dropdown states
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  // New Comment state
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const currentUser = 'appi';

  const fetchIssue = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues/${number}`);
      if (!res.ok) throw new Error('Issue not found');
      const data = await res.json();
      setIssue(data);
      setEditTitle(data.title);
      setEditBody(data.body || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();

    // Fetch filters lists & projects
    async function loadMetadata() {
      try {
        const [labelsRes, milestonesRes, collaboratorsRes, projectsRes] = await Promise.all([
          fetch(`/api/v1/repositories/${owner}/${repo}/labels`),
          fetch(`/api/v1/repositories/${owner}/${repo}/milestones`),
          fetch(`/api/v1/repositories/${owner}/${repo}/collaborators`),
          fetch(`/api/v1/repositories/${owner}/${repo}/projects`),
        ]);

        if (labelsRes.ok) setLabels(await labelsRes.json());
        if (milestonesRes.ok) setMilestones(await milestonesRes.json());
        if (collaboratorsRes.ok) setCollaborators(await collaboratorsRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }
    loadMetadata();
  }, [owner, repo, number]);

  const handleUpdateIssue = async (fields: any) => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues/${number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to update issue');
      await fetchIssue();
      setIsEditingTitle(false);
      setIsEditingBody(false);
    } catch (err) {
      console.error(err);
      alert('Error updating issue');
    }
  };

  // Add issue to Project board
  const handleAddToProject = async (projectId: string) => {
    try {
      if (!issue) return;
      const res = await fetch(`/api/v1/projects/${projectId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'issue',
          itemId: issue.id,
          statusColumn: 'Todo',
        }),
      });
      if (!res.ok) throw new Error('Failed to add to project');
      setActiveProjectBoard(projectId);
      alert('Added to project board!');
      setProjectsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add to project');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues/${number}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment, username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to post comment');
      setNewComment('');
      await fetchIssue();
    } catch (err) {
      console.error(err);
      alert('Failed to post comment');
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editingCommentText, username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      setEditingCommentId(null);
      setEditingCommentText('');
      await fetchIssue();
    } catch (err) {
      console.error(err);
      alert('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser }),
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      await fetchIssue();
    } catch (err) {
      console.error(err);
      alert('Failed to delete comment');
    }
  };

  const toggleLabel = (name: string) => {
    if (!issue) return;
    const current = issue.labels.map((l) => l.name);
    const updated = current.includes(name)
      ? current.filter((l) => l !== name)
      : [...current, name];
    handleUpdateIssue({ labels: updated });
  };

  const toggleAssignee = (username: string) => {
    if (!issue) return;
    const current = issue.assignees.map((a) => a.username);
    const updated = current.includes(username)
      ? current.filter((u) => u !== username)
      : [...current, username];
    handleUpdateIssue({ assignees: updated });
  };

  const setMilestone = (title: string | null) => {
    handleUpdateIssue({ milestone: title });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3"></div>
        <div className="h-4 bg-gray-800 rounded w-1/4"></div>
        <div className="grid grid-cols-4 gap-6 mt-4">
          <div className="col-span-3 h-64 bg-gray-800 rounded"></div>
          <div className="h-64 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="py-16 text-center text-gray-500">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-lg font-semibold text-white mt-2">Issue not found</h3>
        <p className="text-sm mt-1">{error || 'The issue you are looking for does not exist.'}</p>
        <Link href={`/${owner}/${repo}/issues`} className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Issues
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
      {/* Title Header area */}
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
                onClick={() => handleUpdateIssue({ title: editTitle })}
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
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{issue.title}</span>
                <span className="text-gray-500 font-normal">#{issue.number}</span>
                {currentUser === issue.creator.username && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xs font-semibold px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-gray-400 rounded"
                  >
                    Edit title
                  </button>
                )}
              </h1>
            </div>
          )}
        </div>

        {/* State Badge and Meta */}
        <div className="flex items-center gap-2 mt-2 flex-wrap text-sm text-gray-500">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              issue.status === 'OPEN'
                ? 'bg-green-950/80 text-green-400 border border-green-800'
                : 'bg-red-950/80 text-red-400 border border-red-800'
            }`}
          >
            {issue.status === 'OPEN' ? '🟢 Open' : '🔴 Closed'}
          </span>
          <span className="font-semibold text-gray-400">{issue.creator.username}</span>
          <span>opened this issue on {new Date(issue.createdAt).toLocaleDateString()} ·</span>
          <span>{issue.comments.filter(c => !c.isEvent).length} comments</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Timeline comments + Composer (takes 3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Timeline events & comments list */}
          <div className="relative border-l-2 border-[#232830] pl-6 ml-4 flex flex-col gap-6">
            
            {/* Opener post body */}
            <div className="relative">
              <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-[#14171C] border-2 border-[#232830] rounded-full"></div>
              <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
                <div className="bg-[#0E1116] px-4 py-2 border-b border-[#232830] flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{issue.creator.username} commented</span>
                  {currentUser === issue.creator.username && !isEditingBody && (
                    <button
                      onClick={() => setIsEditingBody(true)}
                      className="text-blue-500 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="p-4 text-sm text-gray-300 whitespace-pre-wrap">
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
                          onClick={() => handleUpdateIssue({ body: editBody })}
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
                    issue.body || <span className="italic text-gray-500">No description provided.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Interleaved Timeline Items */}
            {issue.comments.map((comment) => {
              const isCommentAuthor = currentUser === comment.user.username;
              const isEditing = editingCommentId === comment.id;

              if (comment.isEvent) {
                // Render as system event line
                let icon = 'ℹ️';
                if (comment.eventType === 'labeled') icon = '🏷️';
                if (comment.eventType === 'assigned') icon = '👤';
                if (comment.eventType === 'milestoned') icon = '🎯';
                if (comment.eventType === 'status_changed') icon = comment.body.includes('closed') ? '🔴' : '🟢';

                return (
                  <div key={comment.id} className="relative flex items-center gap-2 text-xs text-gray-500 py-1">
                    <span className="absolute -left-[31px] w-4 h-4 bg-[#0B0D10] text-[10px] flex items-center justify-center rounded-full">
                      {icon}
                    </span>
                    <span className="font-bold text-gray-400">@{comment.user.username}</span>
                    <span>{comment.body}</span>
                    <span>· {new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                );
              }

              // Render as normal comment bubble
              return (
                <div key={comment.id} className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-[#14171C] border-2 border-[#232830] rounded-full"></div>
                  <div className="border border-[#232830] rounded-lg bg-[#14171C] overflow-hidden">
                    <div className="bg-[#0E1116] px-4 py-2 border-b border-[#232830] flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{comment.user.username} commented</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
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
                    <div className="p-4 text-sm text-gray-300 whitespace-pre-wrap">
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
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                            >
                              Save comment
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentText('');
                              }}
                              className="px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded text-xs"
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
                </div>
              );
            })}
          </div>

          {/* New Comment Composer */}
          <div className="border-t border-[#232830] pt-6 flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-600 font-bold text-white text-sm flex items-center justify-center select-none shrink-0 mt-1">
              {currentUser[0].toUpperCase()}
            </div>
            <form onSubmit={handleAddComment} className="flex-1 border border-[#232830] bg-[#14171C] rounded-lg overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-[#232830] bg-[#0E1116] text-xs font-semibold text-gray-400">
                Write a reply
              </div>
              <textarea
                rows={4}
                required
                placeholder="Leave a comment"
                className="w-full px-4 py-3 bg-[#1C2128] border-0 text-white text-sm focus:outline-none focus:ring-0"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="px-4 py-2 bg-[#0E1116] border-t border-[#232830] flex justify-end gap-2 items-center">
                {issue.status === 'OPEN' ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateIssue({ status: 'CLOSED' })}
                    className="px-3.5 py-1.5 bg-red-950 text-red-400 border border-red-800 rounded text-xs font-semibold hover:bg-red-900 transition-colors"
                  >
                    🔴 Close issue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpdateIssue({ status: 'OPEN' })}
                    className="px-3.5 py-1.5 bg-green-950 text-green-400 border border-green-800 rounded text-xs font-semibold hover:bg-green-900 transition-colors"
                  >
                    🟢 Reopen issue
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded text-xs transition-colors"
                >
                  Comment
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar settings panel (takes 1 col) */}
        <div className="flex flex-col gap-4 bg-[#14171C] border border-[#232830] rounded-lg p-5">
          
          {/* Assignees Selector */}
          <div className="relative border-b border-[#232830] pb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400">Assignees</span>
              <button
                onClick={() => setAssigneesOpen(!assigneesOpen)}
                className="text-xs text-blue-500 hover:underline"
              >
                ⚙️
              </button>
            </div>
            {issue.assignees.length === 0 ? (
              <span className="text-xs text-gray-500">No assignees</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {issue.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-white">
                    <span className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center font-bold text-[10px]">
                      {a.username[0].toUpperCase()}
                    </span>
                    {a.username}
                  </div>
                ))}
              </div>
            )}

            {assigneesOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Assign to collaborators</div>
                {collaborators.map((c) => {
                  const isAssigned = issue.assignees.some((a) => a.username === c.username);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleAssignee(c.username)}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-blue-600 hover:text-white rounded flex justify-between items-center"
                    >
                      <span>{c.username}</span>
                      {isAssigned && <span className="text-green-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Labels Selector */}
          <div className="relative border-b border-[#232830] pb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400">Labels</span>
              <button
                onClick={() => setLabelsOpen(!labelsOpen)}
                className="text-xs text-blue-500 hover:underline"
              >
                ⚙️
              </button>
            </div>
            {issue.labels.length === 0 ? (
              <span className="text-xs text-gray-500">No labels</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l) => (
                  <span
                    key={l.id}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold"
                    style={{ backgroundColor: `#${l.color}15`, color: `#${l.color}`, border: `1px solid #${l.color}40` }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            )}

            {labelsOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Apply labels</div>
                {labels.map((l) => {
                  const isApplied = issue.labels.some((li) => li.name === l.name);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabel(l.name)}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-blue-600 hover:text-white rounded flex justify-between items-center"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `#${l.color}` }}></span>
                        {l.name}
                      </span>
                      {isApplied && <span className="text-green-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Milestones Selector */}
          <div className="relative border-b border-[#232830] pb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400">Milestone</span>
              <button
                onClick={() => setMilestonesOpen(!milestonesOpen)}
                className="text-xs text-blue-500 hover:underline"
              >
                ⚙️
              </button>
            </div>
            {issue.milestone === null ? (
              <span className="text-xs text-gray-500">No milestone</span>
            ) : (
              <span className="text-xs text-white font-semibold flex items-center gap-1">
                🎯 {issue.milestone.title}
              </span>
            )}

            {milestonesOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Select milestone</div>
                <button
                  type="button"
                  onClick={() => {
                    setMilestone(null);
                    setMilestonesOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-blue-600 hover:text-white rounded"
                >
                  Clear milestone
                </button>
                {milestones.map((m) => {
                  const isCurrent = issue.milestone?.title === m.title;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMilestone(m.title);
                        setMilestonesOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs hover:bg-blue-600 hover:text-white rounded flex justify-between items-center"
                    >
                      <span>{m.title}</span>
                      {isCurrent && <span className="text-green-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Projects Board Selector */}
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400">Projects Board</span>
              <button
                onClick={() => setProjectsOpen(!projectsOpen)}
                className="text-xs text-blue-500 hover:underline"
              >
                ⚙️
              </button>
            </div>
            {activeProjectBoard ? (
              <span className="text-xs text-white font-semibold">
                📋 {projects.find((p) => p.id === activeProjectBoard)?.title || 'Board'}
              </span>
            ) : (
              <span className="text-xs text-gray-500">None</span>
            )}

            {projectsOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Add to project board</div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddToProject(p.id)}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-blue-600 hover:text-white rounded"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
