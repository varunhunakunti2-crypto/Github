"use client";

import React, { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Settings, Clock, User, AlertCircle } from "lucide-react";

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
  assignee?: { id: string; username: string; avatarUrl: string | null } | null;
  issue?: {
    id: string;
    number: number;
    title: string;
    status: "OPEN" | "CLOSED";
  };
  pullRequest?: {
    id: string;
    number: number;
    title: string;
    status: "OPEN" | "CLOSED" | "MERGED";
  };
}

interface RoadmapViewProps {
  project: {
    id: string;
    items: Card[];
  };
  onUpdateItem: () => void;
}

export default function RoadmapView({ project, onUpdateItem }: RoadmapViewProps) {
  const [zoom, setZoom] = useState<"week" | "month" | "quarter">("month");
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "assignee" | "none">("none");

  // Filter out items that have valid dates vs unscheduled items
  const scheduledItems = project.items.filter(item => item.startDate && item.dueDate);
  const unscheduledItems = project.items.filter(item => !item.startDate || !item.dueDate);

  // Generate timeline headers based on zoom level
  const getTimelineHeaders = () => {
    const headers = [];
    const baseDate = new Date(viewDate);
    
    if (zoom === "week") {
      // 8 weeks preview
      baseDate.setDate(baseDate.getDate() - baseDate.getDay() - 14); // start 2 weeks back
      for (let i = 0; i < 8; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i * 7);
        headers.push({
          label: `Wk ${getWeekNumber(d)} (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
          date: d,
          widthPercent: 12.5
        });
      }
    } else if (zoom === "month") {
      // 6 months preview
      baseDate.setMonth(baseDate.getMonth() - 1); // start 1 month back
      for (let i = 0; i < 6; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        headers.push({
          label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          date: d,
          widthPercent: 16.66
        });
      }
    } else {
      // 4 quarters preview
      baseDate.setMonth(Math.floor(baseDate.getMonth() / 3) * 3 - 3); // start 1 quarter back
      for (let i = 0; i < 4; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i * 3);
        const q = Math.floor(d.getMonth() / 3) + 1;
        headers.push({
          label: `Q${q} ${d.getFullYear()}`,
          date: d,
          widthPercent: 25
        });
      }
    }
    return headers;
  };

  const getWeekNumber = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.ceil(diff / (oneDay * 7));
  };

  const headers = getTimelineHeaders();

  // Helper to determine position and width of task bars
  const getTimelineBarStyles = (startDateStr: string, dueDateStr: string) => {
    const start = new Date(startDateStr);
    const end = new Date(dueDateStr);
    const timelineStart = headers[0].date;
    const timelineEnd = new Date(headers[headers.length - 1].date);
    
    if (zoom === "week") {
      timelineEnd.setDate(timelineEnd.getDate() + 7);
    } else if (zoom === "month") {
      timelineEnd.setMonth(timelineEnd.getMonth() + 1);
    } else {
      timelineEnd.setMonth(timelineEnd.getMonth() + 3);
    }

    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    if (end < timelineStart || start > timelineEnd) {
      return { display: "none" }; // Out of view bounds
    }

    const cropStart = Math.max(start.getTime(), timelineStart.getTime());
    const cropEnd = Math.min(end.getTime(), timelineEnd.getTime());

    const left = ((cropStart - timelineStart.getTime()) / totalDuration) * 100;
    const width = ((cropEnd - cropStart) / totalDuration) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%` // minimum 2% width so it's visible
    };
  };

  // Timeline navigation
  const shiftTimeline = (dir: number) => {
    const newDate = new Date(viewDate);
    if (zoom === "week") newDate.setDate(newDate.getDate() + dir * 28);
    else if (zoom === "month") newDate.setMonth(newDate.getMonth() + dir * 3);
    else newDate.setMonth(newDate.getMonth() + dir * 6);
    setViewDate(newDate);
  };

  // Keyboard accessibility updates
  const handleKeyboardReschedule = async (itemId: string, field: "startDate" | "dueDate", value: string) => {
    if (!value) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/projects/${project.id}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        onUpdateItem();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getTitle = (item: Card) => {
    if (item.itemType === "issue" && item.issue) return item.issue.title;
    if (item.itemType === "pull_request" && item.pullRequest) return item.pullRequest.title;
    return item.noteTitle || "Untitled Task";
  };

  // Priority color map
  const getPriorityColor = (p: string | null | undefined) => {
    if (p === "LOW") return "bg-gray-700 text-gray-300";
    if (p === "MEDIUM") return "bg-blue-600 text-blue-100";
    if (p === "HIGH") return "bg-amber-600/30 text-amber-400 border border-amber-500/20";
    if (p === "URGENT") return "bg-red-600/30 text-red-400 border border-red-500/20";
    return "bg-gray-800 text-gray-500";
  };

  return (
    <div className="flex flex-col gap-md select-none">
      
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-sm bg-surface border border-border p-sm rounded-sm">
        <div className="flex items-center gap-xs">
          <button
            onClick={() => shiftTimeline(-1)}
            className="p-xxs rounded-xs hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-space-grotesk text-xs font-bold text-text-primary">
            {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => shiftTimeline(1)}
            className="p-xxs rounded-xs hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-sm">
          {/* Zoom Selector */}
          <div className="flex bg-canvas border border-border rounded-xs p-[2px]">
            {(["week", "month", "quarter"] as const).map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`font-sans text-[10px] font-bold uppercase px-xs py-xxs rounded-xs transition-colors ${
                  zoom === z ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Group By selector */}
          <div className="flex items-center gap-xxs">
            <span className="font-sans text-[10px] font-bold text-text-muted uppercase">Group:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-canvas border border-border rounded-xs px-xs py-xxs text-[10px] text-text-primary focus:outline-none"
            >
              <option value="none">Ungrouped</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Roadmap Board Layout */}
      <div className="flex flex-col lg:flex-row gap-md items-start">
        
        {/* Horizontal Scrollable Timeline View */}
        <div className="flex-1 w-full bg-surface border border-border rounded-sm overflow-hidden flex flex-col min-w-0">
          
          {/* Timeline Headers */}
          <div className="flex border-b border-hairline bg-canvas-soft">
            <div className="w-[180px] shrink-0 p-sm border-r border-hairline font-space-grotesk text-[10px] font-bold text-text-muted uppercase">
              Item Details
            </div>
            <div className="flex-1 flex relative h-10">
              {headers.map(h => (
                <div
                  key={h.label}
                  className="absolute top-0 bottom-0 border-r border-hairline/50 p-xs text-center font-sans text-[9px] font-semibold text-text-muted flex items-center justify-center truncate"
                  style={{ left: `${headers.indexOf(h) * h.widthPercent}%`, width: `${h.widthPercent}%` }}
                >
                  {h.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Items Grid */}
          <div className="divide-y divide-hairline">
            {scheduledItems.length === 0 ? (
              <div className="p-xl text-center text-text-muted font-inter text-xs">
                No scheduled items for this timeline view. Add dates below to schedule them.
              </div>
            ) : (
              scheduledItems.map(item => {
                const barStyle = getTimelineBarStyles(item.startDate!, item.dueDate!);
                return (
                  <div key={item.id} className="flex min-h-[44px] items-center hover:bg-canvas-soft/30 transition-colors relative">
                    {/* Sticky left label */}
                    <div className="w-[180px] shrink-0 p-xs pr-sm border-r border-hairline flex flex-col gap-xxs min-w-0 z-10 bg-surface">
                      <span className="font-sans font-bold text-[11px] text-text-primary truncate" title={getTitle(item)}>
                        {getTitle(item)}
                      </span>
                      <div className="flex items-center gap-xxs">
                        {item.priority && (
                          <span className={`text-[8px] font-mono font-semibold px-xxs py-[0.5px] rounded-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority.toLowerCase()}
                          </span>
                        )}
                        <span className="text-[8px] text-text-muted font-mono">{item.statusColumn}</span>
                      </div>
                    </div>

                    {/* Timeline bar column */}
                    <div className="flex-1 h-full relative min-h-[44px]">
                      {/* Gantt Bar */}
                      {barStyle.display !== "none" && (
                        <div
                          className="absolute top-[10px] h-6 bg-accent-soft/30 border border-accent/20 rounded-xs flex items-center px-sm text-[9px] font-bold text-accent truncate cursor-pointer shadow-sm group"
                          style={barStyle}
                        >
                          <span className="truncate">{getTitle(item)}</span>
                          
                          {/* Hover dates popover */}
                          <div className="absolute top-[-30px] left-0 hidden group-hover:block bg-[#090b10] text-[9px] text-white px-xs py-xxs rounded-xs whitespace-nowrap shadow-md z-20">
                            {new Date(item.startDate!).toLocaleDateString()} - {new Date(item.dueDate!).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar for Unscheduled Items */}
        <div className="w-full lg:w-[300px] shrink-0 bg-surface border border-border p-sm rounded-sm space-y-sm">
          <div className="flex items-center justify-between border-b border-hairline pb-xs">
            <span className="font-space-grotesk text-xs font-bold text-text-primary flex items-center gap-xs">
              <Clock className="w-3.5 h-3.5 text-warning" />
              Unscheduled Items ({unscheduledItems.length})
            </span>
          </div>

          <div className="space-y-xs max-h-[400px] overflow-y-auto pr-xxs">
            {unscheduledItems.length === 0 ? (
              <p className="font-inter text-xs text-text-muted text-center py-md">All items have been scheduled!</p>
            ) : (
              unscheduledItems.map(item => (
                <div key={item.id} className="p-xs bg-canvas border border-border rounded-sm flex flex-col gap-xs">
                  <span className="font-sans font-bold text-xs text-text-primary block truncate">{getTitle(item)}</span>
                  
                  {/* Keyboard date selectors for accessibility */}
                  <div className="grid grid-cols-2 gap-xxs">
                    <div>
                      <label className="text-[9px] text-text-muted font-bold block uppercase">Start Date</label>
                      <input
                        type="date"
                        className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary focus:outline-none"
                        value={item.startDate ? item.startDate.split("T")[0] : ""}
                        onChange={(e) => handleKeyboardReschedule(item.id, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-text-muted font-bold block uppercase">Due Date</label>
                      <input
                        type="date"
                        className="w-full bg-surface border border-border rounded-xs px-xxs py-[2px] text-[10px] text-text-primary focus:outline-none"
                        value={item.dueDate ? item.dueDate.split("T")[0] : ""}
                        onChange={(e) => handleKeyboardReschedule(item.id, "dueDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
