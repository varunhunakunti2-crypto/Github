'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

type TemplateType = 'bug' | 'feature' | 'blank' | null;

export default function NewIssuePage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const router = useRouter();

  const [template, setTemplate] = useState<TemplateType>(null);
  
  // Sidebar data
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  // Selection state
  const [title, setTitle] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);

  // Form Fields State for Bug Report
  const [bugDescribe, setBugDescribe] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [bugExpected, setBugExpected] = useState('');
  const [bugEnv, setBugEnv] = useState('');
  const [bugSeverity, setBugSeverity] = useState('Medium');

  // Form Fields State for Feature Request
  const [featProblem, setFeatProblem] = useState('');
  const [featSolution, setFeatSolution] = useState('');
  const [featAlternatives, setFeatAlternatives] = useState('');

  // Form Fields State for Blank Issue
  const [blankBody, setBlankBody] = useState('');

  // Dropdown states
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current dev user
  const currentUser = 'appi';

  useEffect(() => {
    async function loadMetadata() {
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
        console.error('Error loading metadata:', err);
      }
    }
    loadMetadata();
  }, [owner, repo]);

  // Set default labels based on template
  useEffect(() => {
    if (template === 'bug') {
      setSelectedLabels(['bug']);
    } else if (template === 'feature') {
      setSelectedLabels(['enhancement']);
    } else {
      setSelectedLabels([]);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);

    // Compile body
    let body = '';
    if (template === 'bug') {
      body = `### Bug Description\n${bugDescribe}\n\n### Steps to Reproduce\n${bugSteps}\n\n### Expected Behavior\n${bugExpected}\n\n### Environment\n${bugEnv}\n\n### Severity\n${bugSeverity}`;
    } else if (template === 'feature') {
      body = `### Related Problem\n${featProblem}\n\n### Proposed Solution\n${featSolution}\n\n### Alternatives Considered\n${featAlternatives}`;
    } else {
      body = blankBody;
    }

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          labels: selectedLabels,
          assignees: selectedAssignees,
          milestone: selectedMilestone,
          creator: currentUser,
        }),
      });

      if (!res.ok) throw new Error('Failed to create issue');
      const issue = await res.json();
      router.push(`/${owner}/${repo}/issues/${issue.number}`);
    } catch (err) {
      console.error(err);
      alert('Error creating issue');
      setIsSubmitting(false);
    }
  };

  const toggleLabelSelection = (name: string) => {
    setSelectedLabels((prev) =>
      prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name]
    );
  };

  const toggleAssigneeSelection = (username: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  // 1. Render Template Selector
  if (template === null) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-gray-300">
        <h2 className="text-2xl font-bold text-white mb-2">Create a new issue</h2>
        <p className="text-gray-400 text-sm mb-6">Choose an issue template or open a blank issue to get started.</p>

        <div className="flex flex-col gap-4">
          {/* Bug Report Template Card */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5 flex justify-between items-center hover:border-red-500/50 transition-colors">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🐛</span> Bug report
              </h3>
              <p className="text-xs text-gray-400 mt-1">Create a report to help us reproduce and fix a bug.</p>
            </div>
            <button
              onClick={() => setTemplate('bug')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
            >
              Get started
            </button>
          </div>

          {/* Feature Request Template Card */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5 flex justify-between items-center hover:border-green-500/50 transition-colors">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💡</span> Feature request
              </h3>
              <p className="text-xs text-gray-400 mt-1">Suggest an idea or enhancement for this repository.</p>
            </div>
            <button
              onClick={() => setTemplate('feature')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
            >
              Get started
            </button>
          </div>

          {/* Blank Issue */}
          <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5 flex justify-between items-center hover:border-gray-500/50 transition-colors">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📝</span> Blank issue
              </h3>
              <p className="text-xs text-gray-400 mt-1">Create a custom issue without templates.</p>
            </div>
            <button
              onClick={() => setTemplate('blank')}
              className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-white rounded border border-[#30363D] text-xs font-semibold"
            >
              Open blank issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Template Form with Sidebar
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
      <div className="mb-6 flex items-center gap-2 text-xs">
        <Link href={`/${owner}/${repo}/issues`} className="text-blue-500 hover:underline">Issues</Link>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">New Issue ({template.toUpperCase()})</span>
        <button
          onClick={() => setTemplate(null)}
          className="ml-auto px-2.5 py-1 bg-[#21262D] hover:bg-[#30363D] rounded border border-[#30363D]"
        >
          Change Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main form container */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 bg-[#14171C] border border-[#232830] rounded-lg p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white border-b border-[#232830] pb-3 flex items-center gap-2">
            <span>{template === 'bug' ? '🐛' : template === 'feature' ? '💡' : '📝'}</span>
            Create new {template === 'bug' ? 'bug report' : template === 'feature' ? 'feature request' : 'issue'}
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Title</label>
            <input
              type="text"
              required
              placeholder={template === 'bug' ? 'Bug: Short descriptive title' : template === 'feature' ? 'Feature: Short descriptive title' : 'Title'}
              className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Render inputs based on template */}
          {template === 'bug' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Describe the bug</label>
                <textarea
                  required
                  rows={4}
                  placeholder="A clear and concise description of what the bug is."
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  value={bugDescribe}
                  onChange={(e) => setBugDescribe(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Steps to reproduce</label>
                <textarea
                  rows={3}
                  placeholder="1. Go to '...'\n2. Click on '...'\n3. Scroll down to '...'"
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm font-mono text-xs focus:outline-none focus:border-blue-500"
                  value={bugSteps}
                  onChange={(e) => setBugSteps(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Expected behavior</label>
                <textarea
                  rows={3}
                  placeholder="A clear and concise description of what you expected to happen."
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  value={bugExpected}
                  onChange={(e) => setBugExpected(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Environment info</label>
                  <input
                    type="text"
                    placeholder="OS, Browser version, Node version, etc."
                    className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    value={bugEnv}
                    onChange={(e) => setBugEnv(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Severity</label>
                  <select
                    className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    value={bugSeverity}
                    onChange={(e) => setBugSeverity(e.target.value)}
                  >
                    <option value="Low">🟢 Low</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="High">🔴 High</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {template === 'feature' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Is your feature request related to a problem?</label>
                <textarea
                  rows={3}
                  placeholder="A clear and concise description of what the problem is. Ex. I'm always frustrated when..."
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  value={featProblem}
                  onChange={(e) => setFeatProblem(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Describe the solution you&apos;d like</label>
                <textarea
                  required
                  rows={4}
                  placeholder="A clear and concise description of what you want to happen."
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  value={featSolution}
                  onChange={(e) => setFeatSolution(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Describe alternatives you&apos;ve considered</label>
                <textarea
                  rows={3}
                  placeholder="A clear and concise description of any alternative solutions or features you've considered."
                  className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  value={featAlternatives}
                  onChange={(e) => setFeatAlternatives(e.target.value)}
                />
              </div>
            </>
          )}

          {template === 'blank' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                required
                rows={10}
                placeholder="Leave a description..."
                className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                value={blankBody}
                onChange={(e) => setBlankBody(e.target.value)}
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end border-t border-[#232830] pt-4 mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded text-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Submit new issue'}
            </button>
          </div>
        </form>

        {/* Sidebar metadata selectors */}
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
            {selectedAssignees.length === 0 ? (
              <span className="text-xs text-gray-500">No assignees selected</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {selectedAssignees.map((username) => (
                  <div key={username} className="flex items-center gap-2 text-xs text-white">
                    <span className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center font-bold text-[10px]">
                      {username[0].toUpperCase()}
                    </span>
                    {username}
                  </div>
                ))}
              </div>
            )}

            {assigneesOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Assign to collaborators</div>
                {collaborators.map((c) => {
                  const isAssigned = selectedAssignees.includes(c.username);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleAssigneeSelection(c.username)}
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
            {selectedLabels.length === 0 ? (
              <span className="text-xs text-gray-500">No labels selected</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedLabels.map((name) => {
                  const color = labels.find((l) => l.name === name)?.color || '6e7681';
                  return (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ backgroundColor: `#${color}15`, color: `#${color}`, border: `1px solid #${color}40` }}
                    >
                      {name}
                    </span>
                  );
                })}
              </div>
            )}

            {labelsOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Apply labels</div>
                {labels.map((l) => {
                  const isApplied = selectedLabels.includes(l.name);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabelSelection(l.name)}
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
          <div className="relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400">Milestone</span>
              <button
                onClick={() => setMilestonesOpen(!milestonesOpen)}
                className="text-xs text-blue-500 hover:underline"
              >
                ⚙️
              </button>
            </div>
            {selectedMilestone === null ? (
              <span className="text-xs text-gray-500">No milestone</span>
            ) : (
              <span className="text-xs text-white font-semibold flex items-center gap-1">
                🎯 {selectedMilestone}
              </span>
            )}

            {milestonesOpen && (
              <div className="absolute right-0 top-6 w-full bg-[#161B22] border border-[#30363D] rounded-md shadow-lg z-50 p-2">
                <div className="text-[10px] text-gray-500 font-bold border-b border-[#30363D] pb-1 mb-1">Select milestone</div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMilestone(null);
                    setMilestonesOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-blue-600 hover:text-white rounded"
                >
                  Clear milestone
                </button>
                {milestones.map((m) => {
                  const isCurrent = selectedMilestone === m.title;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMilestone(m.title);
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
        </div>
      </div>
    </div>
  );
}
