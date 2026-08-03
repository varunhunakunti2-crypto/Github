"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronRight,
  RotateCcw, Download, Search, GitBranch, GitCommit, Zap, Package
} from "lucide-react";

interface Step {
  id: string;
  name: string;
  status: string;
  command: string | null;
  logOutput: string | null;
  order: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface Job {
  id: string;
  name: string;
  status: string;
  runsOn: string;
  runnerName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: Step[];
}

interface Artifact {
  id: string;
  name: string;
  sizeBytes: number;
  expiresAt: string | null;
  createdAt: string;
}

interface RunDetail {
  id: string;
  runNumber: number;
  status: string;
  triggerEvent: string;
  headSha: string;
  headBranch: string;
  triggeredBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  workflow: { name: string; filePath: string };
  jobs: Job[];
  artifacts: Artifact[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-success" />,
  failure: <XCircle className="w-4 h-4 text-error" />,
  cancelled: <XCircle className="w-4 h-4 text-warning" />,
  in_progress: <Loader2 className="w-4 h-4 text-link animate-spin" />,
  running: <Loader2 className="w-4 h-4 text-link animate-spin" />,
  queued: <Clock className="w-4 h-4 text-mute" />,
  pending: <Clock className="w-4 h-4 text-mute" />,
  skipped: <ChevronRight className="w-4 h-4 text-mute" />
};

export default function WorkflowRunDetailPage() {
  const { owner, repo, runId } = useParams() as { owner: string; repo: string; runId: string };
  const [run, setRun] = useState<RunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [logSearch, setLogSearch] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchRun = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/workflows/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data);
        // Auto-expand all jobs on first load
        if (expandedJobs.size === 0) {
          setExpandedJobs(new Set(data.jobs.map((j: Job) => j.id)));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRun(); }, [owner, repo, runId]);

  // Auto-poll while run is active
  useEffect(() => {
    if (!run || (run.status !== "queued" && run.status !== "in_progress")) return;
    const interval = setInterval(fetchRun, 3000);
    return () => clearInterval(interval);
  }, [run?.status]);

  const toggleJob = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  };

  const handleRerun = async () => {
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/repositories/${owner}/${repo}/workflows/runs/${runId}/rerun`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    fetchRun();
  };

  const handleCancel = async () => {
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/repositories/${owner}/${repo}/workflows/runs/${runId}/cancel`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    fetchRun();
  };

  const highlightSearch = (text: string) => {
    if (!logSearch) return text;
    const parts = text.split(new RegExp(`(${logSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === logSearch.toLowerCase()
        ? `<mark class="bg-warning/30 text-warning rounded-xs px-[1px]">${part}</mark>`
        : part
    ).join("");
  };

  const getDuration = (start: string | null, end: string | null) => {
    if (!start) return "—";
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const seconds = Math.round((e - s) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (isLoading) {
    return (
      <div className="p-xl flex items-center justify-center gap-xs text-mute">
        <Loader2 className="w-5 h-5 animate-spin text-link" />
        <span className="font-sans text-sm">Loading run details...</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-xl text-center text-mute">
        <p className="font-sans text-sm">Run not found.</p>
        <Link href={`/${owner}/${repo}/actions`} className="text-link hover:underline text-xs mt-xs inline-block">Back to Actions</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-md md:p-xl space-y-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-sm border-b border-hairline pb-sm">
        <div className="space-y-xxs">
          <div className="flex items-center gap-xs text-xs text-mute">
            <Link href={`/${owner}/${repo}/actions`} className="text-link hover:underline">Actions</Link>
            <span>/</span>
            <span>{run.workflow.name}</span>
            <span>/</span>
            <span>#{run.runNumber}</span>
          </div>
          <h1 className="font-sans text-xl font-bold text-ink flex items-center gap-xs">
            {STATUS_ICON[run.status]}
            {run.workflow.name} <span className="text-mute font-mono text-sm">#{run.runNumber}</span>
          </h1>
          <div className="flex items-center gap-sm text-[10px] text-mute font-sans flex-wrap">
            <span className="flex items-center gap-xxs"><GitBranch className="w-3 h-3" /> {run.headBranch}</span>
            <span className="flex items-center gap-xxs"><GitCommit className="w-3 h-3" /> {run.headSha.substring(0, 7)}</span>
            <span>Triggered by: {run.triggerEvent}</span>
            <span>Duration: {getDuration(run.startedAt, run.completedAt)}</span>
          </div>
        </div>

        <div className="flex gap-xs shrink-0">
          <button onClick={handleRerun} className="flex items-center gap-xxs px-sm py-xs bg-canvas border border-hairline rounded-xs text-xs font-semibold text-ink hover:bg-canvas-soft-2 transition-colors">
            <RotateCcw className="w-3 h-3" /> Re-run
          </button>
          {(run.status === "queued" || run.status === "in_progress") && (
            <button onClick={handleCancel} className="flex items-center gap-xxs px-sm py-xs bg-error/10 border border-error/20 rounded-xs text-xs font-semibold text-error hover:bg-error/20 transition-colors">
              <XCircle className="w-3 h-3" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Jobs */}
      <div className="space-y-xs">
        {run.jobs.map(job => (
          <div key={job.id} className="bg-canvas-soft border border-hairline rounded-sm overflow-hidden">
            {/* Job Header */}
            <button
              onClick={() => toggleJob(job.id)}
              className="w-full flex items-center gap-sm p-sm hover:bg-canvas-soft/30 transition-colors text-left"
            >
              {expandedJobs.has(job.id) ? <ChevronDown className="w-4 h-4 text-mute shrink-0" /> : <ChevronRight className="w-4 h-4 text-mute shrink-0" />}
              {STATUS_ICON[job.status]}
              <span className="font-sans font-bold text-sm text-ink flex-1">{job.name}</span>
              <span className="font-mono text-[10px] text-mute">{job.runsOn}</span>
              <span className="font-mono text-[10px] text-mute">{getDuration(job.startedAt, job.completedAt)}</span>
            </button>

            {/* Steps */}
            {expandedJobs.has(job.id) && (
              <div className="border-t border-hairline">
                {job.steps.map(step => (
                  <div key={step.id} className="border-b border-hairline last:border-b-0">
                    <button
                      onClick={() => toggleStep(step.id)}
                      className="w-full flex items-center gap-sm px-md py-xs hover:bg-canvas-soft/20 transition-colors text-left"
                    >
                      {expandedSteps.has(step.id) ? <ChevronDown className="w-3 h-3 text-mute" /> : <ChevronRight className="w-3 h-3 text-mute" />}
                      {STATUS_ICON[step.status]}
                      <span className="font-sans text-xs text-ink flex-1">{step.name}</span>
                      {step.command && <code className="font-mono text-[9px] text-mute truncate max-w-[200px]">{step.command}</code>}
                      <span className="font-mono text-[9px] text-mute">{getDuration(step.startedAt, step.completedAt)}</span>
                    </button>

                    {/* Log Output */}
                    {expandedSteps.has(step.id) && step.logOutput && (
                      <div className="bg-[#0a0c10] border-t border-hairline">
                        {/* Log search bar */}
                        <div className="flex items-center gap-xs px-sm py-xxs border-b border-hairline/50">
                          <Search className="w-3 h-3 text-mute" />
                          <input
                            type="text"
                            placeholder="Search logs..."
                            className="bg-transparent text-[10px] text-ink font-mono focus:outline-none flex-1"
                            value={logSearch}
                            onChange={e => setLogSearch(e.target.value)}
                          />
                        </div>
                        <pre
                          className="p-sm font-mono text-[11px] text-green-400/80 overflow-x-auto whitespace-pre max-h-[400px] overflow-y-auto leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: highlightSearch(step.logOutput) }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Artifacts */}
      {run.artifacts.length > 0 && (
        <div className="bg-canvas-soft border border-hairline rounded-sm p-sm space-y-xs">
          <h2 className="font-sans font-bold text-sm text-ink flex items-center gap-xs">
            <Package className="w-4 h-4 text-link" /> Artifacts ({run.artifacts.length})
          </h2>
          <div className="space-y-xxs">
            {run.artifacts.map(artifact => (
              <div key={artifact.id} className="flex items-center justify-between p-xs bg-canvas border border-hairline rounded-xs">
                <div>
                  <span className="font-sans text-xs text-ink font-semibold">{artifact.name}</span>
                  <span className="font-mono text-[9px] text-mute ml-xs">
                    {(artifact.sizeBytes / 1024).toFixed(1)} KB
                    {artifact.expiresAt && ` · Expires ${new Date(artifact.expiresAt).toLocaleDateString()}`}
                  </span>
                </div>
                <a
                  href={`/api/v1/repositories/${owner}/${repo}/workflows/artifacts/${artifact.id}/download`}
                  className="flex items-center gap-xxs text-link hover:underline text-[10px] font-semibold"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={logEndRef} />
    </div>
  );
}
