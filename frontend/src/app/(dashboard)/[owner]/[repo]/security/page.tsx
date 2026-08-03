"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Button } from "@gitforge/ui";

interface SecurityData {
  openSecretCount: number;
  openDependencyCount: number;
  protectedBranchesCount: number;
  secrets: any[];
  dependencies: any[];
  protectionRules: any[];
}

export default function SecurityOverviewPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = React.use(params);
  const [data, setData] = useState<SecurityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/repositories/${owner}/${repo}/security/overview`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load security overview.");
      }

      const resData = await response.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [owner, repo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent mr-3"></div>
        Loading security analysis...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-lg bg-error/10 border border-error text-error text-sm rounded-sm font-sans">
        Error loading security overview: {error}
      </div>
    );
  }

  const criticalCount = data?.dependencies.filter(d => d.severity === 'critical' || d.severity === 'high').length || 0;

  return (
    <div className="flex flex-col gap-lg font-sans text-gray-200">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white mb-xs">
            Security Analysis
          </h1>
          <p className="text-gray-400 text-sm">
            Post-push code scans, dependency audits, and branch policies posture for {owner}/{repo}.
          </p>
        </div>
        <div className="flex gap-sm">
          <Link href={`/${owner}/${repo}/security/secrets`}>
            <Button className="bg-[#1F242C] hover:bg-[#282F3B] border border-hairline text-white px-md py-xs rounded-sm text-xs">
              Secret Findings
            </Button>
          </Link>
          <Link href={`/${owner}/${repo}/security/dependencies`}>
            <Button className="bg-[#1F242C] hover:bg-[#282F3B] border border-hairline text-white px-md py-xs rounded-sm text-xs">
              Dependency Alerts
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Posture Status Card */}
      <Card className="bg-[#161B22] border-[#30363D] p-lg rounded-sm text-left flex flex-col md:flex-row gap-lg items-center justify-between">
        <div className="flex gap-md items-center">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xl ${criticalCount > 0 || (data?.openSecretCount || 0) > 0 ? 'bg-error/20 text-error' : 'bg-success/20 text-success'}`}>
            🛡️
          </div>
          <div>
            <h3 className="font-sans text-lg font-bold text-white mb-xxs">
              {criticalCount > 0 || (data?.openSecretCount || 0) > 0 
                ? "Actions Required" 
                : "No Immediate Security Concerns Detected"}
            </h3>
            <p className="text-gray-400 text-xs">
              {criticalCount > 0 || (data?.openSecretCount || 0) > 0
                ? `There are unresolved high-priority security concerns that need your attention.`
                : `We haven't found any active secret leaks or critical vulnerabilities in the latest commit.`}
            </p>
          </div>
        </div>
        
        <div className="flex gap-md w-full md:w-auto justify-end">
          <div className="text-center bg-[#0D1117] border border-[#30363D] px-md py-sm rounded-sm min-w-[100px]">
            <div className="text-xl font-bold text-error">{data?.openSecretCount || 0}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Secrets</div>
          </div>
          <div className="text-center bg-[#0D1117] border border-[#30363D] px-md py-sm rounded-sm min-w-[100px]">
            <div className="text-xl font-bold text-warning">{data?.openDependencyCount || 0}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Vulnerabilities</div>
          </div>
          <div className="text-center bg-[#0D1117] border border-[#30363D] px-md py-sm rounded-sm min-w-[100px]">
            <div className="text-xl font-bold text-[#58A6FF]">{data?.protectedBranchesCount || 0}</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Protected</div>
          </div>
        </div>
      </Card>

      {/* Secrets Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        
        {/* Secrets Card */}
        <Card className="bg-[#161B22] border-[#30363D] p-lg rounded-sm text-left">
          <div className="flex justify-between items-center mb-md border-b border-[#30363D] pb-xs">
            <h3 className="font-sans text-md font-bold text-white flex items-center gap-xs">
              🔑 Leaked Secret Scans
            </h3>
            <span className="bg-[#30363D] text-xs px-xs py-xxs rounded-sm text-gray-300 font-mono">
              {data?.openSecretCount || 0} Open
            </span>
          </div>

          {data?.secrets.length === 0 ? (
            <p className="text-gray-400 text-xs py-md">No secret findings detected in git diff histories.</p>
          ) : (
            <div className="flex flex-col gap-sm">
              {data?.secrets.slice(0, 3).map((secret, idx) => (
                <div key={idx} className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm flex justify-between items-center">
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">{secret.secretType}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-xxs">
                      {secret.filePath}:{secret.lineNumber}
                    </div>
                  </div>
                  <Link href={`/${owner}/${repo}/security/secrets`}>
                    <span className="text-xs text-primary hover:underline cursor-pointer">Resolve</span>
                  </Link>
                </div>
              ))}
              {data?.secrets && data.secrets.length > 3 && (
                <Link href={`/${owner}/${repo}/security/secrets`} className="text-xs text-primary hover:underline text-center mt-xs block">
                  View all {data.secrets.length} secret findings
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* Vulnerabilities Card */}
        <Card className="bg-[#161B22] border-[#30363D] p-lg rounded-sm text-left">
          <div className="flex justify-between items-center mb-md border-b border-[#30363D] pb-xs">
            <h3 className="font-sans text-md font-bold text-white flex items-center gap-xs">
              📦 Dependency Vulnerabilities
            </h3>
            <span className="bg-[#30363D] text-xs px-xs py-xxs rounded-sm text-gray-300 font-mono">
              {data?.openDependencyCount || 0} Open
            </span>
          </div>

          {data?.dependencies.length === 0 ? (
            <p className="text-gray-400 text-xs py-md">No vulnerable packages matching manifests found.</p>
          ) : (
            <div className="flex flex-col gap-sm">
              {data?.dependencies.slice(0, 3).map((dep, idx) => (
                <div key={idx} className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm flex justify-between items-center">
                  <div className="text-left">
                    <div className="flex items-center gap-xs">
                      <span className="text-xs font-semibold text-white">{dep.packageName}</span>
                      <span className={`text-[9px] px-xs font-bold uppercase rounded-full ${
                        dep.severity === 'critical' ? 'bg-error/25 text-error' : 
                        dep.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-warning/20 text-warning'
                      }`}>
                        {dep.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-xxs">
                      Manifest: {dep.manifestFilePath} • Range: {dep.vulnerableVersionRange}
                    </div>
                  </div>
                  <Link href={`/${owner}/${repo}/security/dependencies`}>
                    <span className="text-xs text-primary hover:underline cursor-pointer">Fix</span>
                  </Link>
                </div>
              ))}
              {data?.dependencies && data.dependencies.length > 3 && (
                <Link href={`/${owner}/${repo}/security/dependencies`} className="text-xs text-primary hover:underline text-center mt-xs block">
                  View all {data.dependencies.length} dependency alerts
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Branch Protection Summary Section */}
      <Card className="bg-[#161B22] border-[#30363D] p-lg rounded-sm text-left">
        <h3 className="font-sans text-md font-bold text-white mb-md border-b border-[#30363D] pb-xs">
          🔒 Branch Protection Posture
        </h3>
        {data?.protectionRules.length === 0 ? (
          <div className="py-md text-center">
            <p className="text-gray-400 text-xs mb-sm">No branch protection rules configured for this repository.</p>
            <Link href={`/${owner}/${repo}/settings/branches`}>
              <Button className="bg-[#1F242C] hover:bg-[#282F3B] border border-hairline text-white px-md py-xs rounded-sm text-xs">
                Configure Branch Protection
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {data?.protectionRules.map((rule, idx) => (
              <div key={idx} className="bg-[#0D1117] border border-[#30363D] p-md rounded-sm">
                <div className="font-sans font-bold text-sm text-white mb-xs flex items-center justify-between">
                  <span>Pattern: <code className="font-jetbrains-mono text-xs px-xs bg-[#1F242C] text-gray-300 rounded-sm">{rule.branchPattern}</code></span>
                  <span className="text-[10px] text-success font-semibold flex items-center gap-xxs">● Active</span>
                </div>
                <ul className="text-[11px] text-gray-400 space-y-xxs list-disc list-inside">
                  <li>Require PR Merge: {rule.requirePr ? "Yes" : "No"}</li>
                  <li>Required Approvals: {rule.requiredApprovals}</li>
                  <li>Signed Commits: {rule.requireSignedCommits ? "Yes" : "No"}</li>
                  <li>Direct Push Restricted: {rule.restrictPush ? "Yes" : "No"}</li>
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
      
    </div>
  );
}
