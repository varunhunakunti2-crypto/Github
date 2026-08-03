"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@gitforge/ui";

interface SecretFinding {
  id: string;
  commitSha: string;
  filePath: string;
  lineNumber: number;
  secretType: string;
  matchedPatternMasked: string;
  status: 'open' | 'resolved' | 'false_positive' | 'revoked';
  detectedAt: string;
  resolvedAt: string | null;
}

export default function SecretsPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = React.use(params);
  const [findings, setFindings] = useState<SecretFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFindings = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/repositories/${owner}/${repo}/security/secrets`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load secret scanning findings.");
      }

      const data = await response.json();
      setFindings(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [owner, repo]);

  const handleResolve = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/v1/repositories/${owner}/${repo}/security/secrets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update finding status.");
      }

      setFindings(findings.map(f => f.id === id ? { ...f, status: status as any, resolvedAt: new Date().toISOString() } : f));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400 font-inter">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent mr-3"></div>
        Loading findings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-lg bg-danger/10 border border-danger text-danger text-sm rounded-sm font-inter">
        Error loading findings: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg font-inter text-gray-200">
      
      {/* Header */}
      <div>
        <h1 className="font-space-grotesk text-2xl font-bold tracking-tight text-white mb-xs">
          Secret Scanning Findings
        </h1>
        <p className="text-gray-400 text-sm">
          Leaked secrets found in your commits. Exposed keys are highly vulnerable and must be rotated immediately.
        </p>
      </div>

      {findings.length === 0 ? (
        <Card className="bg-[#161B22] border-[#30363D] p-xl rounded-sm text-center">
          <span className="text-3xl">🎉</span>
          <h3 className="font-space-grotesk text-lg font-bold text-white mt-sm">No secrets found</h3>
          <p className="text-gray-400 text-xs mt-xs">
            Push protection scanner hasn't matched any credential patterns in files.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-md">
          {findings.map((finding) => (
            <Card key={finding.id} className="bg-[#161B22] border-[#30363D] p-lg rounded-sm text-left flex flex-col gap-md">
              
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-sm">
                    <span className="font-space-grotesk font-bold text-md text-white">
                      {finding.secretType}
                    </span>
                    <span className={`text-[10px] px-xs font-bold uppercase rounded-full ${
                      finding.status === 'open' ? 'bg-danger/20 text-danger' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {finding.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-xs flex gap-md">
                    <span>File: <code className="bg-[#1F242C] px-xs text-white rounded-sm">{finding.filePath}</code></span>
                    <span>Line: {finding.lineNumber}</span>
                    <span>Commit: <code className="bg-[#1F242C] px-xs text-white rounded-sm">{finding.commitSha.substring(0, 7)}</code></span>
                  </div>
                </div>

                {finding.status === 'open' && (
                  <div className="flex gap-sm">
                    <Button
                      onClick={() => handleResolve(finding.id, "resolved")}
                      className="bg-success hover:bg-success/90 text-white text-xs px-sm py-xxs rounded-sm"
                    >
                      Mark Resolved
                    </Button>
                    <Button
                      onClick={() => handleResolve(finding.id, "false_positive")}
                      className="bg-transparent hover:bg-gray-800 border border-border text-gray-300 text-xs px-sm py-xxs rounded-sm"
                    >
                      False Positive
                    </Button>
                  </div>
                )}
              </div>

              {/* Masked Preview */}
              <div className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm font-mono text-xs text-danger break-all">
                Found matched pattern: {finding.matchedPatternMasked}
              </div>

              {/* Remediation Instructions */}
              <div className="text-xs bg-[#1F242C] border-l-2 border-accent p-sm text-gray-300 rounded-sm">
                <span className="font-bold text-white block mb-xxs">How to Remediate:</span>
                1. <strong>Rotate credential:</strong> Deactivate the exposed key/token immediately on target console.<br/>
                2. <strong>Purge history:</strong> Run <code className="bg-[#0D1117] px-xxs text-white font-mono rounded-sm">git-filter-repo --path {finding.filePath} --invert-paths</code> or use BFG Repo-Cleaner to permanently delete the secret from all commit histories.<br/>
                3. Force push the clean history to GitForge.
              </div>

            </Card>
          ))}
        </div>
      )}
      
    </div>
  );
}
