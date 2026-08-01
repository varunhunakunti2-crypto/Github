"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Inbox, CheckSquare, Plus, ArrowLeft, Settings, Trash2, ShieldAlert, GitPullRequest, Loader2, ArrowRight } from "lucide-react";
import RoadmapView from "@/components/projects/RoadmapView";

interface Card {
  id: string;
  itemType: "issue" | "pull_request" | "note";
  itemId: string | null;
  noteTitle: string | null;
  noteBody: string | null;
  statusColumn: string;
  position: number;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  isDone?: boolean;
  assigneeId?: string | null;
  assignee?: { id: string; username: string; avatarUrl: string | null } | null;
  issue?: {
    id: string;
    number: number;
    title: string;
    status: "OPEN" | "CLOSED";
    labels: { name: string; color: string }[];
    assignees: { username: string; avatarUrl: string | null }[];
  };
  pullRequest?: {
    id: string;
    number: number;
    title: string;
    status: "OPEN" | "CLOSED" | "MERGED";
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
  const router = useRouter();
  const { owner, repo, id } = useParams() as { owner: string; repo: string; id: string };

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<RepoIssue[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Views switcher
  const [currentView, setCurrentView] = useState<"board" | "roadmap">("board");

  // Columns state
  const [columns, setColumns] = useState<string[]>(["Todo", "In Progress", "Done"]);
  const [newColumnName, setNewColumnName] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Card creator state
  const [showAddCard, setShowAddCard] = useState<string | null>(null); // column name
  const [addType, setAddType] = useState<"issue" | "note">("note");
  
  // Note/Task Form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");

  // Issue/PR selection Form
  const [selectedIssueNumber, setSelectedIssueNumber] = useState("");

  // Quick edit status
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [editingDueDate, setEditingDueDate] = useState("");

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

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/settings/collaborators`);
      if (res.ok) {
        setCollaborators(await res.json());
      } else {
        // Fallback mock collaborators
        setCollaborators([
          { id: "1", username: "appi" },
          { id: "2", username: "searchmember" }
        ]);
      }
    } catch (e) {
      console.warn("Failed to fetch collaborators", e);
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchIssuesList();
    fetchCollaborators();
  }, [id, owner, repo]);

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    if (columns.includes(newColumnName.trim())) return;
    setColumns([...columns, newColumnName.trim()]);
    setNewColumnName("");
    setIsAddingColumn(false);
  };

  const handleCreateCard = async (column: string) => {
    const body: any = {
      itemType: addType,
      statusColumn: column,
      startDate: new Date().toISOString()
    };

    if (addType === "note") {
      if (!noteTitle.trim()) return;
      body.noteTitle = noteTitle;
      body.noteBody = noteBody;
      body.priority = taskPriority;
      if (taskDueDate) body.dueDate = new Date(taskDueDate).toISOString();
      if (taskAssignee) body.assigneeId = taskAssignee;
    } else {
      if (!selectedIssueNumber) return;
      body.issueNumber = selectedIssueNumber;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/projects/${id}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNoteTitle("");
        setNoteBody("");
        setSelectedIssueNumber("");
        setTaskDueDate("");
        setTaskAssignee("");
        setShowAddCard(null);
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveCard = async (itemId: string, destinationColumn: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ statusColumn: destinationColumn }),
      });
      if (res.ok) {
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleDone = async (itemId: string, currentDone: boolean) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ isDone: !currentDone }),
      });
      if (res.ok) {
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCardMetadata = async (itemId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const body: any = { priority: editingPriority };
      if (editingDueDate) {
        body.dueDate = new Date(editingDueDate).toISOString();
      }
      
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingCardId(null);
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this item?")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertToIssue = async (itemId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/projects/${id}/items/${itemId}/convert-issue`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) {
      handleMoveCard(cardId, column);
    }
  };

  // Due date check relative logic
  const renderDueDateLabel = (dueDateStr: string | null | undefined, colName: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const isOverdue = due < now && colName.toLowerCase() !== "done";
    
    return (
      <span className={`text-[10px] font-mono font-semibold px-xxs py-[1px] rounded-xs border ${
        isOverdue 
          ? "bg-danger-soft text-danger border-danger/20" 
          : "bg-canvas-soft text-text-muted border-border"
      }`}>
        Due: {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    );
  };

  const getPriorityColor = (p: string | null | undefined) => {
    if (p === "LOW") return "bg-canvas-soft text-text-muted border border-border";
    if (p === "MEDIUM") return "bg-blue-600 text-blue-100";
    if (p === "HIGH") return "bg-amber-600/30 text-amber-400 border border-amber-500/20";
    if (p === "URGENT") return "bg-red-600/30 text-red-400 border border-red-500/20 animate-pulse";
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-xl text-center flex flex-col items-center justify-center gap-xs text-text-muted">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span>Loading project details...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-xl text-center space-y-md">
        <h3 className="font-space-grotesk font-bold text-text-primary">Project Not Found</h3>
        <Link href={`/${owner}/${repo}/projects`} className="text-accent hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-md md:p-xl space-y-md">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-hairline pb-sm">
        <div className="space-y-xxs">
          <div className="flex items-center gap-xs text-xs">
            <Link href={`/${owner}/${repo}/projects`} className="text-accent hover:underline">Projects</Link>
            <span className="text-text-muted">/</span>
            <span className="text-text-muted capitalize">{currentView}</span>
          </div>
          <h1 className="font-space-grotesk text-xl font-bold text-text-primary">{project.title}</h1>
          <p className="font-inter text-xs text-text-muted">{project.description || "No description provided."}</p>
        </div>

        {/* View Switcher Tabs Bar */}
        <div className="flex bg-canvas border border-border p-[2px] rounded-xs self-start sm:self-center">
          <button
            onClick={() => setCurrentView("board")}
            className={`font-sans text-xs font-semibold px-sm py-xs rounded-xs transition-colors ${
              currentView === "board" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setCurrentView("roadmap")}
            className={`font-sans text-xs font-semibold px-sm py-xs rounded-xs transition-colors ${
              currentView === "roadmap" ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Roadmap
          </button>
        </div>
      </div>

      {/* Render Roadmap View if selected */}
      {currentView === "roadmap" ? (
        <RoadmapView project={project} onUpdateItem={fetchBoard} />
      ) : (
        /* Kanban Board Grid View */
        <div className="flex gap-md overflow-x-auto pb-md items-start scrollbar-thin select-none">
          {columns.map(col => {
            const colItems = project.items.filter(item => item.statusColumn === col);

            return (
              <div
                key={col}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
                className="w-80 shrink-0 bg-surface border border-border rounded-sm p-sm flex flex-col gap-sm max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="flex justify-between items-center px-xxs">
                  <span className="font-sans font-bold text-text-primary text-xs flex items-center gap-xs">
                    {col}
                    <span className="px-xs py-[1px] text-[9px] bg-canvas text-text-muted rounded-full font-mono border border-hairline">
                      {colItems.length}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowAddCard(col)}
                    className="p-xxs rounded-xs hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary transition-colors text-xs"
                  >
                    ➕
                  </button>
                </div>

                {/* Add Card Form inline */}
                {showAddCard === col && (
                  <div className="bg-canvas border border-border rounded-sm p-sm flex flex-col gap-sm">
                    <div className="flex gap-xs border-b border-hairline pb-xs">
                      <button
                        type="button"
                        onClick={() => setAddType("note")}
                        className={`text-[9px] font-bold uppercase pb-xxs border-b ${
                          addType === "note" ? "border-accent text-accent" : "border-transparent text-text-muted"
                        }`}
                      >
                        Task
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddType("issue")}
                        className={`text-[9px] font-bold uppercase pb-xxs border-b ${
                          addType === "issue" ? "border-accent text-accent" : "border-transparent text-text-muted"
                        }`}
                      >
                        Issue
                      </button>
                    </div>

                    {addType === "note" ? (
                      <div className="space-y-xs">
                        <input
                          type="text"
                          placeholder="Task title"
                          className="w-full px-xs py-xxs bg-surface border border-border rounded-xs text-text-primary text-xs focus:outline-none"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                        />
                        <textarea
                          rows={2}
                          placeholder="Details..."
                          className="w-full px-xs py-xxs bg-surface border border-border rounded-xs text-text-primary text-xs focus:outline-none resize-none"
                          value={noteBody}
                          onChange={(e) => setNoteBody(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-xxs">
                          <div>
                            <label className="text-[9px] text-text-muted font-bold block uppercase">Priority</label>
                            <select
                              value={taskPriority}
                              onChange={(e) => setTaskPriority(e.target.value as any)}
                              className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary focus:outline-none"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] text-text-muted font-bold block uppercase">Due Date</label>
                            <input
                              type="date"
                              className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary focus:outline-none"
                              value={taskDueDate}
                              onChange={(e) => setTaskDueDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-text-muted font-bold block uppercase">Assignee</label>
                          <select
                            value={taskAssignee}
                            onChange={(e) => setTaskAssignee(e.target.value)}
                            className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary focus:outline-none"
                          >
                            <option value="">Select Assignee...</option>
                            {collaborators.map(c => (
                              <option key={c.id} value={c.id}>
                                @{c.username}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <select
                        className="w-full px-xs py-xxs bg-surface border border-border rounded-xs text-text-primary text-xs focus:outline-none"
                        value={selectedIssueNumber}
                        onChange={(e) => setSelectedIssueNumber(e.target.value)}
                      >
                        <option value="">Select an issue...</option>
                        {issues.map(i => (
                          <option key={i.id} value={i.number}>
                            #{i.number} - {i.title}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex justify-end gap-xs text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleCreateCard(col)}
                        className="px-sm py-xxs bg-accent hover:bg-accent-hover text-white rounded-xs font-semibold"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCard(null)}
                        className="px-sm py-xxs bg-canvas rounded-xs border border-border hover:bg-canvas-soft-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Cards List container */}
                <div className="flex flex-col gap-xs overflow-y-auto pr-xxs">
                  {colItems.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      className="bg-canvas border border-border rounded-sm p-sm hover:border-text-muted cursor-grab active:cursor-grabbing transition-colors flex flex-col gap-sm relative group"
                    >
                      {/* Delete icon */}
                      <button
                        onClick={() => handleDeleteCard(item.id)}
                        className="absolute right-xs top-xs opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs transition-opacity"
                        title="Remove item"
                      >
                        ×
                      </button>

                      {/* Standalone Task (note type) */}
                      {item.itemType === "note" && (
                        <div className="space-y-xs">
                          <div className="flex gap-xs items-start">
                            <input
                              type="checkbox"
                              checked={item.isDone || false}
                              onChange={() => handleToggleDone(item.id, item.isDone || false)}
                              className="mt-xxs accent-success"
                            />
                            <div>
                              <h4 className={`font-sans font-bold text-xs text-text-primary leading-tight ${item.isDone ? "line-through text-text-muted" : ""}`}>
                                {item.noteTitle}
                              </h4>
                              {item.noteBody && (
                                <p className="font-inter text-[11px] text-text-muted mt-xxs whitespace-pre-wrap">{item.noteBody}</p>
                              )}
                            </div>
                          </div>

                          {/* Quick Convert Task to Issue */}
                          <button
                            onClick={() => handleConvertToIssue(item.id)}
                            className="font-sans text-[9px] text-accent hover:underline flex items-center gap-xxs"
                            title="Convert note to real issue"
                          >
                            <ArrowRight className="w-3 h-3" /> Convert to Issue
                          </button>
                        </div>
                      )}

                      {/* Issue details */}
                      {item.itemType === "issue" && item.issue && (
                        <div className="space-y-xs">
                          <div className="flex items-start gap-xs">
                            <span className="text-xs text-success shrink-0">🟢</span>
                            <Link
                              href={`/${owner}/${repo}/issues/${item.issue.number}`}
                              className="font-sans font-bold text-xs text-text-primary hover:text-accent hover:underline leading-tight"
                            >
                              {item.issue.title}
                            </Link>
                          </div>
                          <span className="text-[10px] text-text-muted block">#{item.issue.number}</span>
                        </div>
                      )}

                      {/* Pull Request details */}
                      {item.itemType === "pull_request" && item.pullRequest && (
                        <div className="space-y-xs">
                          <div className="flex items-start gap-xs">
                            <span className="text-xs text-accent shrink-0">🔄</span>
                            <Link
                              href={`/${owner}/${repo}/pull/${item.pullRequest.number}`}
                              className="font-sans font-bold text-xs text-text-primary hover:text-accent hover:underline leading-tight"
                            >
                              {item.pullRequest.title}
                            </Link>
                          </div>
                          <span className="text-[10px] text-text-muted block">#{item.pullRequest.number}</span>
                        </div>
                      )}

                      {/* Metadata Badges */}
                      <div className="flex items-center justify-between gap-xs flex-wrap border-t border-hairline pt-xs">
                        <div className="flex gap-xs flex-wrap items-center">
                          {item.priority && (
                            <span className={`text-[9px] font-mono font-semibold px-xxs py-[0.5px] rounded-xs ${getPriorityColor(item.priority)}`}>
                              {item.priority.toLowerCase()}
                            </span>
                          )}
                          {renderDueDateLabel(item.dueDate, col)}
                        </div>

                        {/* Assignee Avatar */}
                        {item.assignee && (
                          <span
                            className="w-5 h-5 rounded-full bg-canvas-soft-2 border border-hairline text-[8px] flex items-center justify-center font-bold text-text-primary"
                            title={`Assigned to @${item.assignee.username}`}
                          >
                            {item.assignee.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Inline metadata editors */}
                      <div className="flex justify-between items-center text-[9px] text-text-muted pt-xxs">
                        {editingCardId === item.id ? (
                          <div className="w-full flex flex-col gap-xxs bg-canvas border border-border p-xxs rounded-xs z-15">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[8px] uppercase">Edit Card</span>
                              <button onClick={() => setEditingCardId(null)} className="text-text-muted hover:text-text-primary">×</button>
                            </div>
                            <select
                              value={editingPriority}
                              onChange={(e) => setEditingPriority(e.target.value as any)}
                              className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </select>
                            <input
                              type="date"
                              className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary"
                              value={editingDueDate}
                              onChange={(e) => setEditingDueDate(e.target.value)}
                            />
                            <button
                              onClick={() => handleUpdateCardMetadata(item.id)}
                              className="w-full bg-accent text-white text-[9px] py-[2px] font-bold rounded-xs"
                            >
                              Apply
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCardId(item.id);
                              setEditingPriority(item.priority || "MEDIUM");
                              setEditingDueDate(item.dueDate ? item.dueDate.split("T")[0] : "");
                            }}
                            className="text-accent hover:underline"
                          >
                            Quick Edit
                          </button>
                        )}

                        <span className="font-mono text-[8px] text-text-muted">Move to:</span>
                        <div className="flex gap-[2px]">
                          {columns.filter(c => c !== col).map(c => (
                            <button
                              key={c}
                              onClick={() => handleMoveCard(item.id, c)}
                              className="px-xxs py-[1px] bg-canvas border border-border rounded-xs hover:bg-canvas-soft-2 font-mono text-[8px]"
                            >
                              {c.split(" ").map(w => w[0]).join("")}
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

          {/* Add Column button form */}
          <div className="w-80 shrink-0">
            {isAddingColumn ? (
              <form onSubmit={handleAddColumn} className="bg-surface border border-border p-sm rounded-sm flex flex-col gap-xs">
                <input
                  type="text"
                  required
                  placeholder="Column name..."
                  className="px-xs py-xxs bg-canvas border border-border rounded-xs text-text-primary text-xs focus:outline-none"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                />
                <div className="flex gap-xs text-[10px] justify-end">
                  <button type="submit" className="px-sm py-xxs bg-accent hover:bg-accent-hover text-white rounded-xs font-semibold">
                    Add
                  </button>
                  <button type="button" onClick={() => setIsAddingColumn(false)} className="px-sm py-xxs bg-canvas rounded-xs border border-border">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full p-sm bg-surface border border-dashed border-border rounded-sm hover:border-text-muted text-text-muted hover:text-text-primary font-semibold text-xs transition-colors"
              >
                + Add column
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
