'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Card {
  id: string;
  itemType: 'issue' | 'pull_request' | 'note';
  itemId: string | null;
  noteTitle: string | null;
  noteBody: string | null;
  statusColumn: string;
  position: number;
  issue?: {
    id: string;
    number: number;
    title: string;
    status: 'OPEN' | 'CLOSED';
    labels: { name: string; color: string }[];
    assignees: { username: string; avatarUrl: string | null }[];
  };
  pullRequest?: {
    id: string;
    number: number;
    title: string;
    status: 'OPEN' | 'CLOSED' | 'MERGED';
    creator: { username: string; avatarUrl: string | null };
  };
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  items: Card[];
}

interface RepoIssue {
  id: string;
  number: number;
  title: string;
}

export default function ProjectBoardPage() {
  const { owner, repo, id } = useParams() as { owner: string; repo: string; id: string };

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<RepoIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Columns list
  const [columns, setColumns] = useState<string[]>(['Todo', 'In Progress', 'Done']);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Card creator state
  const [showAddCard, setShowAddCard] = useState<string | null>(null); // column name
  const [addType, setAddType] = useState<'issue' | 'note'>('note');
  
  // Note Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  
  // Issue/PR selection Form
  const [selectedIssueNumber, setSelectedIssueNumber] = useState('');

  const currentUser = 'appi';

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);

        // Gather any custom columns that exist in items
        const itemColumns = data.items.map((item: Card) => item.statusColumn);
        const uniqueColumns = Array.from(new Set([...columns, ...itemColumns]));
        setColumns(uniqueColumns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIssuesList = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/issues`);
      if (res.ok) {
        setIssues(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchIssuesList();
  }, [id, owner, repo]);

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    if (columns.includes(newColumnName.trim())) return;
    setColumns([...columns, newColumnName.trim()]);
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleCreateCard = async (column: string) => {
    const body: any = {
      itemType: addType,
      statusColumn: column,
    };

    if (addType === 'note') {
      if (!noteTitle.trim()) return;
      body.noteTitle = noteTitle;
      body.noteBody = noteBody;
    } else {
      if (!selectedIssueNumber) return;
      body.issueNumber = selectedIssueNumber;
    }

    try {
      const res = await fetch(`/api/v1/projects/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNoteTitle('');
        setNoteBody('');
        setSelectedIssueNumber('');
        setShowAddCard(null);
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveCard = async (itemId: string, destinationColumn: string) => {
    try {
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusColumn: destinationColumn }),
      });
      if (res.ok) {
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the project board?')) return;

    try {
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      handleMoveCard(cardId, column);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading project board...</div>;
  }

  if (!project) {
    return (
      <div className="py-16 text-center text-gray-500">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-lg font-semibold text-white mt-2">Board not found</h3>
        <Link href={`/${owner}/${repo}/projects`} className="text-blue-500 hover:underline mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 text-gray-300 flex flex-col gap-6">
      
      {/* Header details */}
      <div className="flex justify-between items-start border-b border-[#232830] pb-4 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <Link href={`/${owner}/${repo}/projects`} className="text-blue-500 hover:underline">Projects</Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-400">Board</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">{project.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{project.description || 'No description'}</p>
        </div>

        {/* Add column trigger */}
        <div className="flex gap-2">
          {isAddingColumn ? (
            <form onSubmit={handleAddColumn} className="flex gap-1.5 items-center">
              <input
                type="text"
                required
                placeholder="Column name"
                className="px-2.5 py-1 bg-[#1C2128] border border-[#30363D] rounded text-white text-xs focus:outline-none"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
              />
              <button type="submit" className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-semibold">
                Add
              </button>
              <button type="button" onClick={() => setIsAddingColumn(false)} className="px-2.5 py-1 bg-[#21262D] rounded text-xs">
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded text-xs font-semibold"
            >
              + Add column
            </button>
          )}
        </div>
      </div>

      {/* Board Scrollable Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
        {columns.map((col) => {
          const colItems = project.items.filter((item) => item.statusColumn === col);

          return (
            <div
              key={col}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
              className="w-80 shrink-0 bg-[#14171C] border border-[#232830] rounded-lg p-3 flex flex-col gap-3 max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center px-1">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  {col}
                  <span className="px-2 py-0.5 text-[10px] bg-[#21262D] text-gray-400 rounded-full font-mono">
                    {colItems.length}
                  </span>
                </span>
                <button
                  onClick={() => setShowAddCard(col)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  ➕
                </button>
              </div>

              {/* Add card form inside column */}
              {showAddCard === col && (
                <div className="bg-[#1C2128] border border-[#30363D] rounded-lg p-3 flex flex-col gap-2.5">
                  <div className="flex gap-2 border-b border-[#30363D] pb-1.5">
                    <button
                      type="button"
                      onClick={() => setAddType('note')}
                      className={`text-[10px] font-bold uppercase pb-0.5 ${addType === 'note' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
                    >
                      Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddType('issue')}
                      className={`text-[10px] font-bold uppercase pb-0.5 ${addType === 'issue' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
                    >
                      Issue
                    </button>
                  </div>

                  {addType === 'note' ? (
                    <>
                      <input
                        type="text"
                        placeholder="Note title"
                        className="w-full px-2 py-1 bg-[#0B0D10] border border-[#30363D] rounded text-white text-xs focus:outline-none"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                      />
                      <textarea
                        rows={2}
                        placeholder="Details..."
                        className="w-full px-2 py-1 bg-[#0B0D10] border border-[#30363D] rounded text-white text-xs focus:outline-none"
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                      />
                    </>
                  ) : (
                    <select
                      className="w-full px-2 py-1 bg-[#0B0D10] border border-[#30363D] rounded text-white text-xs focus:outline-none"
                      value={selectedIssueNumber}
                      onChange={(e) => setSelectedIssueNumber(e.target.value)}
                    >
                      <option value="">Select an issue...</option>
                      {issues.map((i) => (
                        <option key={i.id} value={i.number}>
                          #{i.number} - {i.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex justify-end gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleCreateCard(col)}
                      className="px-2.5 py-1 bg-green-600 text-white rounded font-bold"
                    >
                      Add card
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCard(null)}
                      className="px-2.5 py-1 bg-[#21262D] rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Cards List */}
              <div className="flex flex-col gap-2 overflow-y-auto">
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    className="bg-[#1C2128] border border-[#30363D] rounded-lg p-3 hover:border-gray-500 cursor-grab active:cursor-grabbing transition-colors flex flex-col gap-2 relative group"
                  >
                    
                    {/* Delete card */}
                    <button
                      onClick={() => handleDeleteCard(item.id)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 text-xs transition-opacity"
                    >
                      ×
                    </button>

                    {/* Note Render */}
                    {item.itemType === 'note' && (
                      <div>
                        <h4 className="font-bold text-white text-xs">{item.noteTitle}</h4>
                        <p className="text-[11px] text-gray-400 mt-1 whitespace-pre-wrap">{item.noteBody}</p>
                      </div>
                    )}

                    {/* Issue Render */}
                    {item.itemType === 'issue' && item.issue && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-green-500">🟢</span>
                          <Link
                            href={`/${owner}/${repo}/issues/${item.issue.number}`}
                            className="font-bold text-white text-xs hover:text-blue-400 hover:underline leading-tight"
                          >
                            {item.issue.title}
                          </Link>
                        </div>
                        <span className="text-[10px] text-gray-500">#{item.issue.number}</span>
                        
                        {/* Labels */}
                        {item.issue.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.issue.labels.map((l) => (
                              <span
                                key={l.name}
                                className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                                style={{ backgroundColor: `#${l.color}15`, color: `#${l.color}`, border: `1px solid #${l.color}40` }}
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Assignees */}
                        {item.issue.assignees.length > 0 && (
                          <div className="flex justify-end mt-1.5">
                            <div className="flex -space-x-1">
                              {item.issue.assignees.map((a) => (
                                <span
                                  key={a.username}
                                  className="w-4 h-4 rounded-full bg-gray-600 text-[8px] flex items-center justify-center font-bold text-white ring-1 ring-[#1C2128]"
                                >
                                  {a.username[0].toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PR Render */}
                    {item.itemType === 'pull_request' && item.pullRequest && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-blue-500">🔄</span>
                          <Link
                            href={`/${owner}/${repo}/pull/${item.pullRequest.number}`}
                            className="font-bold text-white text-xs hover:text-blue-400 hover:underline leading-tight"
                          >
                            {item.pullRequest.title}
                          </Link>
                        </div>
                        <span className="text-[10px] text-gray-500">#{item.pullRequest.number}</span>
                      </div>
                    )}

                    {/* Keyboard Accessible Column Movement Selector */}
                    <div className="border-t border-[#30363D] pt-1.5 mt-1 flex justify-between items-center text-[10px] text-gray-500">
                      <span>Move card:</span>
                      <div className="flex gap-1">
                        {columns
                          .filter((c) => c !== col)
                          .map((c) => (
                            <button
                              key={c}
                              onClick={() => handleMoveCard(item.id, c)}
                              className="px-1.5 py-0.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] rounded text-gray-400 hover:text-white"
                            >
                              {c.split(' ').map((w) => w[0]).join('')}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
