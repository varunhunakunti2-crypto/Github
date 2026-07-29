'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
  _count?: {
    issues: number;
  };
}

export default function LabelsPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };

  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create / Edit form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('0969da'); // Default blue

  // Preset color swatches matching GitHub's default colors
  const presetColors = [
    '0969da', // Blue
    '1a7f37', // Green
    'd1242f', // Red
    'cf222e', // Coral
    'bf8700', // Yellow
    '8c95a0', // Grey
    'bfdadc', // Light Blue
    'fef2c0', // Light Yellow
    'b60205', // Dark Red
    'd93f0b', // Orange
  ];

  const fetchLabels = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/labels`);
      if (res.ok) {
        setLabels(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, [owner, repo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: color.replace('#', ''), description }),
      });
      if (res.ok) {
        setName('');
        setDescription('');
        setColor('0969da');
        setShowCreateForm(false);
        fetchLabels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent, originalName: string) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/labels/${originalName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: color.replace('#', ''), description }),
      });
      if (res.ok) {
        setEditingLabelId(null);
        setName('');
        setDescription('');
        setColor('0969da');
        fetchLabels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (labelName: string) => {
    if (!confirm(`Warning: Deleting the label "${labelName}" will remove it from all issues and PRs using it. Are you sure you want to proceed?`)) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/labels/${labelName}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchLabels();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
      
      {/* Header and Toggle Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 items-center">
          <Link
            href={`/${owner}/${repo}/labels`}
            className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded-l text-xs font-semibold text-white"
          >
            🏷️ Labels
          </Link>
          <Link
            href={`/${owner}/${repo}/milestones`}
            className="px-3.5 py-1.5 hover:bg-[#30363D] border-t border-b border-r border-[#30363D] rounded-r text-xs font-semibold"
          >
            🎯 Milestones
          </Link>
        </div>
        <button
          onClick={() => {
            setEditingLabelId(null);
            setShowCreateForm(!showCreateForm);
            setName('');
            setDescription('');
            setColor('0969da');
          }}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'New label'}
        </button>
      </div>

      {/* Create label Form Panel */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-[#14171C] border border-[#232830] rounded-lg p-5 mb-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create New Label</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Label name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Description</label>
              <input
                type="text"
                placeholder="Optional description"
                className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="#ffffff"
                  className="w-24 px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                  value={`#${color}`}
                  onChange={(e) => setColor(e.target.value.replace('#', ''))}
                />
                {/* Swatches */}
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  {presetColors.map((pc) => (
                    <button
                      key={pc}
                      type="button"
                      onClick={() => setColor(pc)}
                      className="w-5 h-5 rounded-full border border-black/40 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: `#${pc}` }}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#232830] pt-3">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
            >
              Create label
            </button>
          </div>
        </form>
      )}

      {/* Labels List */}
      <div className="bg-[#14171C] border border-[#232830] rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[#0E1116] border-b border-[#232830] text-xs font-bold text-gray-400 uppercase tracking-wider">
          {labels.length} Labels
        </div>

        {isLoading ? (
          <div className="p-8 text-center animate-pulse">Loading labels...</div>
        ) : labels.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <span className="text-3xl mb-2">🏷️</span>
            <span className="font-semibold text-white">No labels exist yet</span>
            <span className="text-xs mt-1">Create labels to tag and organize issues.</span>
          </div>
        ) : (
          <div className="divide-y divide-[#232830]">
            {labels.map((l) => {
              const isEditing = editingLabelId === l.id;

              if (isEditing) {
                return (
                  <form
                    key={l.id}
                    onSubmit={(e) => handleUpdate(e, l.name)}
                    className="p-4 bg-[#0E1116] flex flex-col gap-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Description"
                          className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="w-24 px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs font-mono"
                          value={`#${color}`}
                          onChange={(e) => setColor(e.target.value.replace('#', ''))}
                        />
                        <div className="flex flex-wrap gap-1 items-center">
                          {presetColors.map((pc) => (
                            <button
                              key={pc}
                              type="button"
                              onClick={() => setColor(pc)}
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: `#${pc}` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLabelId(null)}
                        className="px-2.5 py-1 bg-[#21262D] rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div key={l.id} className="p-4 flex justify-between items-center hover:bg-[#161B22]/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0 self-start"
                      style={{
                        backgroundColor: `#${l.color}15`,
                        color: `#${l.color}`,
                        border: `1px solid #${l.color}40`,
                      }}
                    >
                      {l.name}
                    </span>
                    <span className="text-xs text-gray-500">{l.description || 'No description'}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-xs text-gray-500">
                      {l._count?.issues || 0} issues
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingLabelId(l.id);
                          setName(l.name);
                          setDescription(l.description || '');
                          setColor(l.color);
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(l.name)}
                        className="text-xs text-red-500 hover:underline"
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
