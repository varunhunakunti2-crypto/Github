"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Input } from "@gitforge/ui";

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
  actor?: { id: string; username: string } | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [historyCursors, setHistoryCursors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterActor, setFilterActor] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterTargetType, setFilterTargetType] = useState("");

  const fetchLogs = async (cursor?: string, isNext: boolean = true) => {
    setIsLoading(true);
    setError("");
    try {
      const cursorParam = cursor ? `&cursor=${cursor}` : "";
      const actorParam = filterActor ? `&actor=${encodeURIComponent(filterActor)}` : "";
      const actionParam = filterAction ? `&action=${encodeURIComponent(filterAction)}` : "";
      const targetParam = filterTargetType ? `&targetType=${encodeURIComponent(filterTargetType)}` : "";

      const response = await fetch(`/api/v1/admin/logs?limit=25${cursorParam}${actorParam}${actionParam}${targetParam}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load audit logs.");
      }

      const data = await response.json();
      setLogs(data.logs || []);
      
      if (isNext) {
        if (cursor) {
          setHistoryCursors([...historyCursors, cursor]);
        }
      } else {
        const hist = [...historyCursors];
        hist.pop();
        setHistoryCursors(hist);
      }

      setNextCursor(data.nextCursor || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset page navigation history when filters change
    setHistoryCursors([]);
    fetchLogs();
  }, [filterActor, filterAction, filterTargetType]);

  const handleNextPage = () => {
    if (nextCursor) {
      fetchLogs(nextCursor, true);
    }
  };

  const handlePrevPage = () => {
    const prevCursor = historyCursors[historyCursors.length - 2];
    fetchLogs(prevCursor, false);
  };

  const triggerExport = () => {
    const actorParam = filterActor ? `&actor=${encodeURIComponent(filterActor)}` : "";
    const actionParam = filterAction ? `&action=${encodeURIComponent(filterAction)}` : "";
    const targetParam = filterTargetType ? `&targetType=${encodeURIComponent(filterTargetType)}` : "";
    
    // Redirect or fetch to download
    window.open(`/api/v1/admin/logs/export?token=${localStorage.getItem("access_token")}${actorParam}${actionParam}${targetParam}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-md text-gray-200">
      
      {/* Filters and Export row */}
      <div className="flex flex-wrap justify-between items-center gap-sm bg-[#161B22] border border-[#30363D] p-sm rounded-sm text-xs">
        <div className="flex items-center gap-md flex-wrap">
          <div className="flex items-center gap-xs">
            <span className="text-gray-400">Actor:</span>
            <Input
              placeholder="e.g. appi"
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="bg-[#0D1117] border border-[#30363D] text-white text-xs px-xs py-xxs rounded-sm w-[100px]"
            />
          </div>

          <div className="flex items-center gap-xs">
            <span className="text-gray-400">Action:</span>
            <Input
              placeholder="e.g. repo.create"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-[#0D1117] border border-[#30363D] text-white text-xs px-xs py-xxs rounded-sm w-[120px]"
            />
          </div>

          <div className="flex items-center gap-xs">
            <span className="text-gray-400">Target Type:</span>
            <select
              value={filterTargetType}
              onChange={(e) => setFilterTargetType(e.target.value)}
              className="bg-[#0D1117] border border-[#30363D] text-white px-xs py-xxs rounded-sm"
            >
              <option value="">All Targets</option>
              <option value="User">User</option>
              <option value="Repository">Repository</option>
              <option value="Branch">Branch</option>
              <option value="PullRequest">Pull Request</option>
              <option value="Issue">Issue</option>
              <option value="AdminReport">Moderation Report</option>
              <option value="Platform">Platform Access</option>
            </select>
          </div>
        </div>

        <Button
          onClick={triggerExport}
          className="bg-success hover:bg-success/90 text-white text-xs px-sm py-xxs rounded-sm font-semibold"
        >
          📥 Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-gray-400">Loading audit logs...</div>
      ) : error ? (
        <div className="p-md bg-error/10 border border-error text-error text-sm rounded-sm">{error}</div>
      ) : logs.length === 0 ? (
        <Card className="bg-[#161B22] border-[#30363D] p-xl rounded-sm text-center">
          <span className="text-3xl">📝</span>
          <h3 className="font-sans text-lg font-bold text-white mt-sm">No logs recorded</h3>
          <p className="text-gray-400 text-xs mt-xxs">No audit logs matching this search filter were found.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-xs">
          <div className="bg-[#0D1117] border border-[#30363D] rounded-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#161B22] border-b border-[#30363D] text-gray-400 uppercase font-bold tracking-wider">
                  <th className="p-sm">Timestamp</th>
                  <th className="p-sm">Actor</th>
                  <th className="p-sm">Action Type</th>
                  <th className="p-sm">Target</th>
                  <th className="p-sm">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161B22]/50">
                    <td className="p-sm text-gray-400 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-sm text-white font-semibold">
                      {log.actor ? `@${log.actor.username}` : "System"}
                    </td>
                    <td className="p-sm font-mono text-[#F85149] font-bold">
                      {log.action}
                    </td>
                    <td className="p-sm text-gray-400">
                      {log.targetType} ({log.targetId.substring(0, 8)})
                    </td>
                    <td className="p-sm text-gray-300 max-w-xs truncate" title={log.details || ""}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-sm">
            <Button
              disabled={historyCursors.length === 0}
              onClick={handlePrevPage}
              className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-hairline rounded-sm disabled:opacity-50"
            >
              Previous
            </Button>
            <Button
              disabled={!nextCursor}
              onClick={handleNextPage}
              className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-hairline rounded-sm disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
