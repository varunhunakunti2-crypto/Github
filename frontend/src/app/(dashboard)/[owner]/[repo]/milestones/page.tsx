'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  issues: { status: 'OPEN' | 'CLOSED' }[];
  _count: {
    issues: number;
  };
}

export default function MilestonesPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [isLoading, setIsLoading] = useState(true);

  // Forms
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchMilestones = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/milestones`);
      if (res.ok) {
        setMilestones(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [owner, repo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setDueDate('');
        setShowCreateForm(false);
        fetchMilestones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });
      if (res.ok) {
        setEditingMilestoneId(null);
        setTitle('');
        setDescription('');
        setDueDate('');
        fetchMilestones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleState = async (id: string, currentStatus: 'OPEN' | 'CLOSED') => {
    const nextStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchMilestones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/milestones/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMilestones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMilestones = milestones.filter(
    (m) => m.status.toLowerCase() === activeTab
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
      
      {/* Header and Toggle Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 items-center">
          <Link
            href={`/${owner}/${repo}/labels`}
            className="px-3.5 py-1.5 hover:bg-[#30363D] border-t border-b border-l border-[#30363D] rounded-l text-xs font-semibold"
          >
            🏷️ Labels
          </Link>
          <Link
            href={`/${owner}/${repo}/milestones`}
            className="px-3.5 py-1.5 bg-[#21262D] border border-[#30363D] rounded-r text-xs font-semibold text-white"
          >
            🎯 Milestones
          </Link>
        </div>
        <button
          onClick={() => {
            setEditingMilestoneId(null);
            setShowCreateForm(!showCreateForm);
            setTitle('');
            setDescription('');
            setDueDate('');
          }}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'New milestone'}
        </button>
      </div>

      {/* Create / Edit Form */}
      {(showCreateForm || editingMilestoneId) && (
        <form
          onSubmit={(e) => {
            if (editingMilestoneId) {
              handleUpdate(e, editingMilestoneId);
            } else {
              handleCreate(e);
            }
          }}
          className="bg-[#14171C] border border-[#232830] rounded-lg p-5 mb-6 flex flex-col gap-4"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {editingMilestoneId ? 'Edit Milestone' : 'Create New Milestone'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. v1.0.0 Release"
                className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Due date (optional)</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-bold mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the goals of this milestone..."
              className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#232830] pt-3">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
            >
              {editingMilestoneId ? 'Save changes' : 'Create milestone'}
            </button>
          </div>
        </form>
      )}

      {/* Milestones List Panel */}
      <div className="bg-[#14171C] border border-[#232830] rounded-lg overflow-hidden">
        
        {/* Toggle between Open and Closed milestones */}
        <div className="px-4 py-3 bg-[#0E1116] border-b border-[#232830] flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('open')}
            className={activeTab === 'open' ? 'text-white font-bold' : 'text-gray-500 hover:text-gray-300'}
          >
            🟢 Open Milestones
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={activeTab === 'closed' ? 'text-white font-bold' : 'text-gray-500 hover:text-gray-300'}
          >
            🔴 Closed Milestones
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center animate-pulse">Loading milestones...</div>
        ) : filteredMilestones.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <span className="text-3xl mb-2">🎯</span>
            <span className="font-semibold text-white">No milestones match your view</span>
            <span className="text-xs mt-1">Create a milestone to group issues and track project progression.</span>
          </div>
        ) : (
          <div className="divide-y divide-[#232830]">
            {filteredMilestones.map((m) => {
              // Calculate completion progress
              const totalIssues = m.issues.length;
              const closedIssues = m.issues.filter((i) => i.status === 'CLOSED').length;
              const percent = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0;

              return (
                <div key={m.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[#161B22]/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${owner}/${repo}/issues?milestone=${m.title}`}
                        className="text-base font-bold text-white hover:text-blue-400 hover:underline"
                      >
                        {m.title}
                      </Link>
                      {m.dueDate && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          📅 Due by {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 max-w-xl">{m.description || 'No description provided.'}</p>
                  </div>

                  {/* Progress bar and details */}
                  <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{percent}% complete</span>
                      <span>{closedIssues} closed · {totalIssues - closedIssues} open</span>
                    </div>
                    <div className="w-full bg-[#1C2128] h-2 rounded-full overflow-hidden border border-[#30363D]">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 text-xs font-semibold text-gray-500 mt-1 justify-end">
                      <Link
                        href={`/${owner}/${repo}/issues?milestone=${m.title}`}
                        className="text-blue-500 hover:underline"
                      >
                        View issues
                      </Link>
                      <button
                        onClick={() => {
                          setEditingMilestoneId(m.id);
                          setTitle(m.title);
                          setDescription(m.description || '');
                          setDueDate(m.dueDate ? m.dueDate.split('T')[0] : '');
                        }}
                        className="hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleState(m.id, m.status)}
                        className="hover:text-white"
                      >
                        {m.status === 'OPEN' ? 'Close' : 'Reopen'}
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
