"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button } from "@gitforge/ui";

interface AdminReport {
  id: string;
  reportedType: "user" | "repository" | "comment" | "issue";
  reportedId: string;
  reason: string;
  description: string | null;
  status: "pending" | "reviewing" | "actioned" | "dismissed";
  createdAt: string;
  reporter: { id: string; username: string };
  reviewedBy?: { id: string; username: string } | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Actions state
  const [actioningReport, setActioningReport] = useState<AdminReport | null>(null);
  const [dismissingReport, setDismissingReport] = useState<AdminReport | null>(null);
  
  const [actionNote, setActionNote] = useState("");
  const [dismissReason, setDismissReason] = useState("false_positive");

  const fetchReports = async () => {
    setIsLoading(true);
    setError("");
    try {
      const typeParam = typeFilter ? `&type=${typeFilter}` : "";
      const response = await fetch(`/api/v1/admin/reports?status=${statusFilter}${typeParam}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load moderation reports.");
      }

      const data = await response.json();
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  const handleReview = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/admin/reports/${id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to mark report as reviewing.");
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAction = async () => {
    if (!actioningReport) return;
    try {
      const response = await fetch(`/api/v1/admin/reports/${actioningReport.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ actionNote }),
      });

      if (!response.ok) throw new Error("Failed to submit action taken.");
      setActioningReport(null);
      setActionNote("");
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDismiss = async () => {
    if (!dismissingReport) return;
    try {
      const response = await fetch(`/api/v1/admin/reports/${dismissingReport.id}/dismiss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ reason: dismissReason }),
      });

      if (!response.ok) throw new Error("Failed to dismiss report.");
      setDismissingReport(null);
      setActionNote("");
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getEntityLink = (report: AdminReport) => {
    if (report.reportedType === "repository") {
      return `/${report.reportedId}`;
    }
    if (report.reportedType === "user") {
      return `/${report.reportedId}`;
    }
    return "#";
  };

  return (
    <div className="flex flex-col gap-md text-gray-200">
      
      {/* Filters Bar */}
      <div className="flex flex-wrap justify-between items-center gap-sm bg-[#161B22] border border-[#30363D] p-sm rounded-sm text-xs">
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <span className="text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0D1117] border border-[#30363D] text-white px-xs py-xxs rounded-sm"
            >
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="actioned">Actioned</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-xs">
            <span className="text-gray-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#0D1117] border border-[#30363D] text-white px-xs py-xxs rounded-sm"
            >
              <option value="">All Types</option>
              <option value="repository">Repository</option>
              <option value="user">User</option>
              <option value="comment">Comment</option>
              <option value="issue">Issue</option>
            </select>
          </div>
        </div>

        <Button onClick={fetchReports} className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-border rounded-sm">
          Refresh Queue
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-gray-400">Loading reports queue...</div>
      ) : error ? (
        <div className="p-md bg-danger/10 border border-danger text-danger text-sm rounded-sm">{error}</div>
      ) : reports.length === 0 ? (
        <Card className="bg-[#161B22] border-[#30363D] p-xl rounded-sm text-center">
          <span className="text-3xl">🛡️</span>
          <h3 className="font-space-grotesk text-lg font-bold text-white mt-sm">Moderation queue empty</h3>
          <p className="text-gray-400 text-xs mt-xxs">No reports match the selected filters.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-sm">
          {reports.map((report) => (
            <Card key={report.id} className="bg-[#161B22] border-[#30363D] p-md rounded-sm flex flex-col gap-sm text-left">
              
              {/* Header Info */}
              <div className="flex justify-between items-start flex-wrap gap-xs">
                <div>
                  <div className="flex items-center gap-xs">
                    <span className="font-bold text-white uppercase text-xs font-space-grotesk bg-[#30363D] px-xs py-xxs rounded-sm">
                      {report.reportedType}
                    </span>
                    <span className="text-xs font-semibold text-gray-300">
                      Report ID: <code className="font-mono text-[10px] text-white">{report.id.substring(0, 8)}</code>
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-xs">
                    Reporter: <strong>@{report.reporter.username}</strong> • Submitted: {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Queue Actions */}
                <div className="flex gap-xs">
                  {report.status === "pending" && (
                    <Button
                      onClick={() => handleReview(report.id)}
                      className="bg-accent hover:bg-accent/90 text-white text-xs px-xs py-xxs rounded-sm font-semibold"
                    >
                      Mark Reviewing
                    </Button>
                  )}

                  {(report.status === "pending" || report.status === "reviewing") && (
                    <>
                      <Button
                        onClick={() => setActioningReport(report)}
                        className="bg-success hover:bg-success/90 text-white text-xs px-xs py-xxs rounded-sm font-semibold"
                      >
                        Action Taken
                      </Button>
                      <Button
                        onClick={() => setDismissingReport(report)}
                        className="bg-transparent hover:bg-gray-800 text-gray-300 border border-border text-xs px-xs py-xxs rounded-sm"
                      >
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Reported Entity details */}
              <div className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm flex flex-col gap-xxs text-xs">
                <div>
                  <span className="text-gray-400 font-semibold mr-xs">Reason:</span>
                  <span className="text-white uppercase font-bold text-[10px] bg-danger/25 text-danger px-xs py-xxs rounded-full">{report.reason}</span>
                </div>
                <div className="mt-xxs">
                  <span className="text-gray-400 font-semibold mr-xs">Reported Entity:</span>
                  <a
                    href={getEntityLink(report)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline font-mono"
                  >
                    {report.reportedId}
                  </a>
                </div>
                {report.description && (
                  <div className="text-gray-300 mt-xs border-t border-[#232830] pt-xxs italic">
                    "{report.description}"
                  </div>
                )}
              </div>

            </Card>
          ))}
        </div>
      )}

      {/* Action Taken Modal */}
      {actioningReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-md z-50">
          <Card className="bg-[#161B22] border-[#30363D] p-lg max-w-md w-full rounded-sm text-left flex flex-col gap-md">
            <h3 className="font-space-grotesk font-bold text-md text-white">Record Moderation Action</h3>
            <div className="flex flex-col gap-xs">
              <label className="text-xs font-semibold text-gray-300">Action Details (Required for Audit Logs):</label>
              <textarea
                placeholder="E.g., User account suspended, repository forced to archive."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-white text-xs px-3 py-2 rounded-md h-20 resize-none w-full"
              />
            </div>
            <div className="flex justify-end gap-sm mt-xs">
              <Button
                onClick={() => {
                  setActioningReport(null);
                  setActionNote("");
                }}
                className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-border rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={!actionNote.trim()}
                className="bg-success hover:bg-success/90 text-white text-xs px-sm py-xxs rounded-sm"
              >
                Submit Action
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Dismiss Modal */}
      {dismissingReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-md z-50">
          <Card className="bg-[#161B22] border-[#30363D] p-lg max-w-md w-full rounded-sm text-left flex flex-col gap-md">
            <h3 className="font-space-grotesk font-bold text-md text-white">Dismiss Moderation Report</h3>
            
            <div className="flex flex-col gap-xs">
              <label className="text-xs font-semibold text-gray-300">Reason for Dismissal:</label>
              <select
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="bg-[#0D1117] border-[#30363D] text-white text-xs px-2 py-1.5 rounded-md w-full"
              >
                <option value="false_positive">False Positive / Not violating</option>
                <option value="resolved">Already Resolved</option>
                <option value="insufficient_evidence">Insufficient Evidence</option>
              </select>
            </div>

            <div className="flex justify-end gap-sm mt-xs">
              <Button
                onClick={() => {
                  setDismissingReport(null);
                  setDismissReason("false_positive");
                }}
                className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-border rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDismiss}
                className="bg-danger hover:bg-danger/90 text-white text-xs px-sm py-xxs rounded-sm"
              >
                Confirm Dismissal
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
