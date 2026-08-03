"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@gitforge/ui";

interface DependencyAlert {
  id: string;
  packageName: string;
  packageEcosystem: string;
  vulnerableVersionRange: string;
  patchedVersion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cveId: string | null;
  status: 'open' | 'dismissed' | 'fixed';
  manifestFilePath: string;
  detectedAt: string;
}

export default function DependenciesPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = React.use(params);
  const [alerts, setAlerts] = useState<DependencyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissingAlertId, setDismissingAlertId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("false_positive");

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/repositories/${owner}/${repo}/security/dependencies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load dependency alerts.");
      }

      const data = await response.json();
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [owner, repo]);

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/repositories/${owner}/${repo}/security/dependencies/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ status: "dismissed", reason: dismissReason }),
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss alert.");
      }

      setAlerts(alerts.map(a => a.id === id ? { ...a, status: "dismissed" } : a));
      setDismissingAlertId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400 font-inter">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent mr-3"></div>
        Loading dependency alerts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-lg bg-danger/10 border border-danger text-danger text-sm rounded-sm font-inter">
        Error loading alerts: {error}
      </div>
    );
  }

  // Group by severity
  const groupedAlerts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = acc[alert.severity] || [];
    acc[alert.severity].push(alert);
    return acc;
  }, {} as Record<string, DependencyAlert[]>);

  const severitiesOrder: Array<DependencyAlert['severity']> = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="flex flex-col gap-lg font-inter text-gray-200">
      
      {/* Header */}
      <div>
        <h1 className="font-space-grotesk text-2xl font-bold tracking-tight text-white mb-xs">
          Dependency Vulnerabilities
        </h1>
        <p className="text-gray-400 text-sm">
          Known vulnerabilities in third-party library dependencies matched from lockfiles or manifest specs.
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card className="bg-[#161B22] border-[#30363D] p-xl rounded-sm text-center">
          <span className="text-3xl">🎉</span>
          <h3 className="font-space-grotesk text-lg font-bold text-white mt-sm">No vulnerable packages</h3>
          <p className="text-gray-400 text-xs mt-xs">
            We haven't matched any outdated dependencies with known CVE advisories in requirements or lockfiles.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-lg">
          {severitiesOrder.map((severity) => {
            const list = groupedAlerts[severity] || [];
            if (list.length === 0) return null;

            return (
              <div key={severity} className="flex flex-col gap-sm">
                <h3 className="font-space-grotesk font-bold text-sm text-white uppercase tracking-wider flex items-center gap-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    severity === 'critical' ? 'bg-danger' : 
                    severity === 'high' ? 'bg-orange-500' : 'bg-warning'
                  }`}></span>
                  {severity} ({list.length})
                </h3>

                <div className="flex flex-col gap-md">
                  {list.map((alert) => (
                    <Card key={alert.id} className="bg-[#161B22] border-[#30363D] p-lg rounded-sm text-left flex flex-col gap-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-sm">
                            <span className="font-space-grotesk font-bold text-md text-white">
                              {alert.packageName}
                            </span>
                            <span className="text-[10px] px-xs bg-gray-800 text-gray-400 rounded-sm">
                              {alert.packageEcosystem}
                            </span>
                            <span className={`text-[10px] px-xs font-bold uppercase rounded-full ${
                              alert.status === 'open' ? 'bg-danger/20 text-danger' : 'bg-gray-700 text-gray-400'
                            }`}>
                              {alert.status}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-400 font-mono mt-xs flex flex-wrap gap-md">
                            <span>Manifest: <code className="bg-[#1F242C] px-xs text-white rounded-sm">{alert.manifestFilePath}</code></span>
                            <span>Range: {alert.vulnerableVersionRange}</span>
                            <span>Patched in: <strong className="text-success">{alert.patchedVersion}</strong></span>
                            {alert.cveId && (
                              <span>
                                CVE ID:{" "}
                                <a
                                  href={`https://nvd.nist.gov/vuln/detail/${alert.cveId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent hover:underline"
                                >
                                  {alert.cveId}
                                </a>
                              </span>
                            )}
                          </div>
                        </div>

                        {alert.status === 'open' && (
                          <div className="flex gap-sm">
                            {dismissingAlertId === alert.id ? (
                              <div className="flex items-center gap-xs">
                                <select
                                  value={dismissReason}
                                  onChange={(e) => setDismissReason(e.target.value)}
                                  className="bg-[#1F242C] text-xs text-white border border-[#30363D] px-xs py-xxs rounded-sm"
                                >
                                  <option value="false_positive">False Positive</option>
                                  <option value="risk_accepted">Risk Accepted</option>
                                  <option value="wont_fix">Won't Fix</option>
                                </select>
                                <Button
                                  onClick={() => handleDismiss(alert.id)}
                                  className="bg-danger hover:bg-danger/90 text-white text-xs px-xs py-xxs rounded-sm font-semibold"
                                >
                                  Confirm Dismiss
                                </Button>
                                <Button
                                  onClick={() => setDismissingAlertId(null)}
                                  className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-xs py-xxs rounded-sm border border-border"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => setDismissingAlertId(alert.id)}
                                className="bg-transparent hover:bg-[#282F3B] border border-border text-gray-300 text-xs px-sm py-xxs rounded-sm font-semibold"
                              >
                                Dismiss Alert
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
    </div>
  );
}
