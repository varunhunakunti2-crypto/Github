'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  _count: {
    items: number;
  };
}

export default function ProjectsListPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/projects`);
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [owner, repo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setShowCreateForm(false);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300">
      
      {/* Upper header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>📋</span> Projects
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'New project'}
        </button>
      </div>

      {/* Create project form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-[#14171C] border border-[#232830] rounded-lg p-5 mb-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create New Project Board</h3>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Project title</label>
              <input
                type="text"
                required
                placeholder="e.g. Sprint 1 Roadmap"
                className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-bold mb-1">Description</label>
              <textarea
                rows={3}
                placeholder="Describe the goals of this project board..."
                className="w-full px-3 py-1.5 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#232830] pt-3">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-semibold"
            >
              Create project
            </button>
          </div>
        </form>
      )}

      {/* Projects list */}
      <div className="bg-[#14171C] border border-[#232830] rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[#0E1116] border-b border-[#232830] text-xs font-bold text-gray-400 uppercase tracking-wider">
          {projects.length} Project Boards
        </div>

        {isLoading ? (
          <div className="p-8 text-center animate-pulse">Loading project boards...</div>
        ) : projects.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <span className="text-3xl mb-2">📋</span>
            <span className="font-semibold text-white">No projects exist yet</span>
            <span className="text-xs mt-1">Create projects to map tasks using Kanban boards.</span>
          </div>
        ) : (
          <div className="divide-y divide-[#232830]">
            {projects.map((project) => (
              <div key={project.id} className="p-5 flex justify-between items-center hover:bg-[#161B22]/30 transition-colors">
                <div>
                  <Link
                    href={`/${owner}/${repo}/projects/${project.id}`}
                    className="text-base font-bold text-white hover:text-blue-400 hover:underline"
                  >
                    {project.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">{project.description || 'No description provided.'}</p>
                  <span className="text-[10px] text-gray-500 mt-2 block">
                    Created on {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <span className="text-xs text-gray-500">
                    📋 {project._count?.items || 0} items
                  </span>
                  <Link
                    href={`/${owner}/${repo}/projects/${project.id}`}
                    className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded text-xs font-semibold"
                  >
                    Open board
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
