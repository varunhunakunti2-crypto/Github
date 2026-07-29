'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
  _count: { comments: number };
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

export default function IssuesPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };

  const [issues, setIssues] = useState<Issue[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [activeState, setActiveState] = useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('newest');

  // Dropdown open states
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [milestoneDropdownOpen, setMilestoneDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Bulk actions selection
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Current logged in user (assumed 'appi' for local dev context)
  const currentUser = 'appi';

  // Load basic filters info
  useEffect(() => {
    async function loadFilters() {
      try {
        const [labelsRes, milestonesRes, collaboratorsRes] = await Promise.all([
          fetch(`/api/v1/repositories/${owner}/${repo}/labels`),
          fetch(`/api/v1/repositories/${owner}/${repo}/milestones`),
          fetch(`/api/v1/repositories/${owner}/${repo}/collaborators`),
        ]);

        if (labelsRes.ok) setLabels(await labelsRes.json());
        if (milestonesRes.ok) setMilestones(await milestonesRes.json());
        if (collaboratorsRes.ok) setCollaborators(await collaboratorsRes.json());
      } catch (err) {
        console.error('Error fetching filter lists:', err);
      }
    }
    loadFilters();
  }, [owner, repo]);

  // Load Issues with current filters
  useEffect(() => {
    async function loadIssues() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('state', activeState);
        queryParams.set('sort', sortBy);
        if (searchQuery) queryParams.set('q', searchQuery);
        if (selectedLabel) queryParams.set('label', selectedLabel);
        if (selectedAssignee) queryParams.set('assignee', selectedAssignee);
        if (selectedMilestone) queryParams.set('milestone', selectedMilestone);

        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Failed to load issues');
        const data = await res.json();
        setIssues(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    loadIssues();
  }, [owner, repo, activeState, searchQuery, selectedLabel, selectedAssignee, selectedMilestone, sortBy]);

  // Count open/closed total from frontend state or secondary fetch
  const openCount = activeState === 'open' ? issues.length : 0; // Simple fallback counts
  const closedCount = activeState === 'closed' ? issues.length : 0;

  const handleSelectIssue = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllIssues = () => {
    if (selectedIssueIds.length === issues.length) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(issues.map((i) => i.id));
    }
  };

  // Bulk actions operations
  const handleBulkUpdate = async (updateDto: any) => {
    try {
      await Promise.all(
        issues
          .filter((i) => selectedIssueIds.includes(i.id))
          .map((i) =>
            fetch(`/api/v1/repositories/${owner}/${repo}/issues/${i.number}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...updateDto, username: currentUser }),
            })
          )
      );
      // Reload page state
      setSelectedIssueIds([]);
      setActiveState(activeState); // Trigger reload
    } catch (err) {
      console.error('Error applying bulk updates:', err);
    }
  };

  const isFilterActive = searchQuery || selectedLabel || selectedAssignee || selectedMilestone;

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedLabel(null);
    setSelectedAssignee(null);
    setSelectedMilestone(null);
  };

  return (
    <div className="flex flex-col gap-6 text-gray-300">
      {/* Upper header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>⚠️</span> Issues
        </h2>
        <Link
          href={`/${owner}/${repo}/issues/new`}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors"
        >
          New issue
        </Link>
      </div>

      {/* Filter and search bar */}
      <div className="bg-[#14171C] border border-[#232830] rounded-lg overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-[#232830] bg-[#0E1116] items-center">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">🔍</span>
            <input
              type="text"
              placeholder="Search all issues..."
              className="w-full pl-10 pr-4 py-1.5 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Dropdown triggers */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Label Filter */}
            <div className="relative">
              <button
                onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#21262D] hover:bg-[#30363D] rounded-md border border-[#30363D] flex items-center gap-1.5"
              >
                Label {selectedLabel && `(${selectedLabel})`} ▾
              </button>
              {labelDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 py-1">
                  <div className="px-3 py-1 text-xs text-gray-500 border-b border-[#30363D]">Filter by label</div>
                  <button
                    onClick={() => {
                      setSelectedLabel(null);
                      setLabelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white"
                  >
                    Clear filter
                  </button>
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setSelectedLabel(l.name);
                        setLabelDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white flex items-center gap-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `#${l.color}` }}></span>
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Assignee Filter */}
            <div className="relative">
              <button
                onClick={() => setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#21262D] hover:bg-[#30363D] rounded-md border border-[#30363D] flex items-center gap-1.5"
              >
                Assignee {selectedAssignee && `(${selectedAssignee})`} ▾
              </button>
              {assigneeDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 py-1">
                  <div className="px-3 py-1 text-xs text-gray-500 border-b border-[#30363D]">Filter by assignee</div>
                  <button
                    onClick={() => {
                      setSelectedAssignee(null);
                      setAssigneeDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white"
                  >
                    Clear filter
                  </button>
                  {collaborators.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedAssignee(c.username);
                        setAssigneeDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white flex items-center gap-2"
                    >
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.username} className="w-4 h-4 rounded-full" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-gray-600 text-[10px] flex items-center justify-center font-bold">
                          {c.username[0].toUpperCase()}
                        </span>
                      )}
                      {c.username}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Milestone Filter */}
            <div className="relative">
              <button
                onClick={() => setMilestoneDropdownOpen(!milestoneDropdownOpen)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#21262D] hover:bg-[#30363D] rounded-md border border-[#30363D] flex items-center gap-1.5"
              >
                Milestone {selectedMilestone && `(${selectedMilestone})`} ▾
              </button>
              {milestoneDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 py-1">
                  <div className="px-3 py-1 text-xs text-gray-500 border-b border-[#30363D]">Filter by milestone</div>
                  <button
                    onClick={() => {
                      setSelectedMilestone(null);
                      setMilestoneDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white"
                  >
                    Clear filter
                  </button>
                  {milestones.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMilestone(m.title);
                        setMilestoneDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white"
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort options */}
            <div className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#21262D] hover:bg-[#30363D] rounded-md border border-[#30363D] flex items-center gap-1.5"
              >
                Sort ▾
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 py-1">
                  <div className="px-3 py-1 text-xs text-gray-500 border-b border-[#30363D]">Sort issues</div>
                  {[
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'most_commented', label: 'Most Commented' },
                    { value: 'recently_updated', label: 'Recently Updated' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSortBy(s.value);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white ${
                        sortBy === s.value ? 'font-bold text-white bg-[#21262D]' : ''
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* State Selection Headers and Bulk Actions Header */}
        <div className="bg-[#1C2128] border-b border-[#232830] px-4 py-3 flex justify-between items-center">
          <div className="flex gap-4 items-center">
            {/* Bulk select checkbox */}
            <input
              type="checkbox"
              checked={issues.length > 0 && selectedIssueIds.length === issues.length}
              onChange={handleSelectAllIssues}
              className="rounded bg-[#0B0D10] border-[#30363D] text-blue-600 focus:ring-0 cursor-pointer"
            />

            {selectedIssueIds.length > 0 ? (
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
                <span>Selected {selectedIssueIds.length} issues</span>
                <button
                  onClick={() => handleBulkUpdate({ status: 'CLOSED' })}
                  className="px-2.5 py-1 bg-[#21262D] hover:bg-red-950 hover:text-red-400 border border-[#30363D] rounded"
                >
                  Bulk Close
                </button>
                <button
                  onClick={() => handleBulkUpdate({ status: 'OPEN' })}
                  className="px-2.5 py-1 bg-[#21262D] hover:bg-green-950 hover:text-green-400 border border-[#30363D] rounded"
                >
                  Bulk Reopen
                </button>
              </div>
            ) : (
              <div className="flex gap-3 text-sm font-semibold">
                <button
                  onClick={() => setActiveState('open')}
                  className={`flex items-center gap-1.5 ${
                    activeState === 'open' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  🟢 Open
                </button>
                <button
                  onClick={() => setActiveState('closed')}
                  className={`flex items-center gap-1.5 ${
                    activeState === 'closed' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  🔴 Closed
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {isFilterActive && (
          <div className="px-4 py-2 border-b border-[#232830] bg-[#0E1116] flex flex-wrap gap-2 items-center text-xs">
            <span className="text-gray-500 font-semibold">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 bg-[#21262D] rounded border border-[#30363D] flex items-center gap-1">
                Text: &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white ml-0.5">×</button>
              </span>
            )}
            {selectedLabel && (
              <span className="px-2 py-0.5 bg-[#21262D] rounded border border-[#30363D] flex items-center gap-1">
                Label: {selectedLabel}
                <button onClick={() => setSelectedLabel(null)} className="text-gray-500 hover:text-white ml-0.5">×</button>
              </span>
            )}
            {selectedAssignee && (
              <span className="px-2 py-0.5 bg-[#21262D] rounded border border-[#30363D] flex items-center gap-1">
                Assignee: {selectedAssignee}
                <button onClick={() => setSelectedAssignee(null)} className="text-gray-500 hover:text-white ml-0.5">×</button>
              </span>
            )}
            {selectedMilestone && (
              <span className="px-2 py-0.5 bg-[#21262D] rounded border border-[#30363D] flex items-center gap-1">
                Milestone: {selectedMilestone}
                <button onClick={() => setSelectedMilestone(null)} className="text-gray-500 hover:text-white ml-0.5">×</button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-blue-500 hover:underline ml-1">
              Clear all
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y divide-[#232830]">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 flex gap-3 items-center animate-pulse">
                <div className="w-4 h-4 bg-gray-800 rounded"></div>
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-gray-800 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && issues.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <span className="text-4xl mb-4">⚠️</span>
            <h3 className="text-lg font-semibold text-white">
              {isFilterActive ? 'No issues match your filters' : 'No issues exist yet'}
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              {isFilterActive
                ? 'Try adjusting your search tags, assignees, or labels to find the issue you are looking for.'
                : 'Create issues to track bugs, tasks, or features for this repository.'}
            </p>
          </div>
        )}

        {/* Issues List */}
        {!isLoading && issues.length > 0 && (
          <div className="divide-y divide-[#232830]">
            {issues.map((issue) => (
              <div key={issue.id} className="p-4 flex gap-3 hover:bg-[#161B22] transition-colors items-start">
                {/* Select Checkbox */}
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={selectedIssueIds.includes(issue.id)}
                    onChange={() => handleSelectIssue(issue.id)}
                    className="rounded bg-[#0B0D10] border-[#30363D] text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* State Icon */}
                <div className="pt-0.5">
                  {issue.status === 'OPEN' ? (
                    <span className="text-green-500 font-bold">🟢</span>
                  ) : (
                    <span className="text-red-500 font-bold">🔴</span>
                  )}
                </div>

                {/* Info and tags */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <Link
                      href={`/${owner}/${repo}/issues/${issue.number}`}
                      className="font-bold text-white hover:text-blue-400 text-base"
                    >
                      {issue.title}
                    </Link>

                    {/* Label tags */}
                    {issue.labels.map((l) => (
                      <span
                        key={l.id}
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `#${l.color}15`,
                          color: `#${l.color}`,
                          border: `1px solid #${l.color}40`,
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>

                  {/* Metadata subtitle */}
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>#{issue.number} opened {new Date(issue.createdAt).toLocaleDateString()} by {issue.creator.username}</span>
                    {issue.milestone && (
                      <span className="flex items-center gap-1 text-gray-400">
                        🎯 {issue.milestone.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignees and comment count */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Assignees stacked */}
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {issue.assignees.map((a) => (
                      <div key={a.id} className="relative group">
                        {a.avatarUrl ? (
                          <img
                            src={a.avatarUrl}
                            alt={a.username}
                            className="w-5 h-5 rounded-full ring-2 ring-[#0B0D10]"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-gray-600 text-[9px] flex items-center justify-center font-bold text-white ring-2 ring-[#0B0D10]">
                            {a.username[0].toUpperCase()}
                          </span>
                        )}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap z-50">
                          {a.username}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Comment Count */}
                  {issue._count.comments > 0 && (
                    <Link
                      href={`/${owner}/${repo}/issues/${issue.number}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400"
                    >
                      💬 {issue._count.comments}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
