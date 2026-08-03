"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Play, RotateCcw, XCircle, CheckCircle2, Clock, Loader2, AlertTriangle,
  GitBranch, GitCommit, Zap, Filter
} from "lucide-react";

interface WorkflowRun {
  id: string;
  runNumber: number;
  status: string;
  triggerEvent: string;
  headSha: string;
  headBranch: string;
  triggeredBy: string | null;
  createdAt: string;
  workflow: { name: string; filePath: string };
  jobs: { id: string; name: string; status: string }[];
  _count: { artifacts: number };
}

interface Workflow {
  id: string;
  name: string;
  filePath: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-success", bg: "bg-success/10" },
  failure: { icon: <XCircle className="w-4 h-4" />, color: "text-error", bg: "bg-error/10" },
  cancelled: { icon: <XCircle className="w-4 h-4" />, color: "text-warning", bg: "bg-warning/10" },
  in_progress: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-link", bg: "bg-link/10" },
  queued: { icon: <Clock className="w-4 h-4" />, color: "text-mute", bg: "bg-canvas-soft" }
};

export default function ActionsPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = async () => {
    try {
      const [runsRes, wfRes] = await Promise.all([
        fetch(`/api/v1/repositories/${owner}/${repo}/workflows/runs`),
        fetch(`/api/v1/repositories/${owner}/${repo}/workflows`)
      ]);
      if (runsRes.ok) setRuns(await runsRes.json());
      if (wfRes.ok) setWorkflows(await wfRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [owner, repo]);

  const handleDispatch = async (workflowId: string) => {
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/repositories/${owner}/${repo}/workflows/${workflowId}/dispatch`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    fetchData();
  };

  const handleCancel = async (runId: string) => {
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/repositories/${owner}/${repo}/workflows/runs/${runId}/cancel`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    fetchData();
  };

  const filteredRuns = statusFilter === "all"
    ? runs
    : runs.filter(r => r.status === statusFilter);

  if (isLoading) {
    return (
      <div className="p-xl flex items-center justify-center gap-xs text-mute">
        <Loader2 className="w-5 h-5 animate-spin text-link" />
        <span className="font-sans text-sm">Loading workflows...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-md md:p-xl space-y-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
        <div>
          <h1 className="font-sans text-xl font-bold text-ink flex items-center gap-xs">
            <Zap className="w-5 h-5 text-link" />
            Actions
          </h1>
          <p className="font-sans text-xs text-mute mt-xxs">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""} · {runs.length} run{runs.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Manual Dispatch */}
        {workflows.length > 0 && (
          <div className="flex gap-xs flex-wrap">
            {workflows.map(wf => (
              <button
                key={wf.id}
                onClick={() => handleDispatch(wf.id)}
                className="flex items-center gap-xxs px-sm py-xs bg-primary hover:bg-primary/90 text-on-primary rounded-xs font-sans text-xs font-semibold transition-colors"
              >
                <Play className="w-3 h-3" /> Run {wf.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-xs border-b border-hairline pb-sm">
        <Filter className="w-3.5 h-3.5 text-mute" />
        {["all", "success", "failure", "in_progress", "queued", "cancelled"].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`font-sans text-[10px] font-bold uppercase px-xs py-xxs rounded-xs transition-colors ${
              statusFilter === f
                ? "bg-primary text-on-primary"
                : "text-mute hover:text-ink hover:bg-canvas-soft"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <div className="text-center py-xl space-y-xs">
          <AlertTriangle className="w-8 h-8 text-mute mx-auto" />
          <p className="font-sans text-sm text-mute">
            {runs.length === 0 ? "No workflow runs yet." : "No runs match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-xs">
          {filteredRuns.map(run => {
            const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.queued;
            return (
              <Link
                key={run.id}
                href={`/${owner}/${repo}/actions/${run.id}`}
                className="flex items-center gap-sm p-sm bg-canvas-soft border border-hairline rounded-sm hover:border-hairline-strong transition-colors group"
              >
                {/* Status Icon */}
                <div className={`p-xs rounded-xs ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-xs">
                    <span className="font-sans font-bold text-sm text-ink group-hover:text-link truncate">
                      {run.workflow.name}
                    </span>
                    <span className="font-mono text-[10px] text-mute">#{run.runNumber}</span>
                  </div>
                  <div className="flex items-center gap-sm mt-xxs text-[10px] text-mute font-sans">
                    <span className="flex items-center gap-xxs">
                      <GitBranch className="w-3 h-3" /> {run.headBranch}
                    </span>
                    <span className="flex items-center gap-xxs">
                      <GitCommit className="w-3 h-3" /> {run.headSha.substring(0, 7)}
                    </span>
                    <span>{run.triggerEvent}</span>
                    <span>{new Date(run.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Job badges */}
                <div className="flex gap-xxs shrink-0">
                  {run.jobs.map(job => {
                    const jCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                    return (
                      <span key={job.id} className={`${jCfg.color} ${jCfg.bg} px-xs py-[1px] rounded-xs text-[9px] font-mono font-semibold`}>
                        {job.name}
                      </span>
                    );
                  })}
                </div>

                {/* Cancel button for in-progress runs */}
                {(run.status === "in_progress" || run.status === "queued") && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleCancel(run.id); }}
                    className="p-xxs rounded-xs hover:bg-error/10 text-mute hover:text-error transition-colors"
                    title="Cancel run"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
