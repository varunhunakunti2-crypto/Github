"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@gitforge/ui";

interface DailyMetric {
  id: string;
  date: string;
  totalUsers: number;
  newUsers: number;
  totalRepositories: number;
  newRepositories: number;
  totalPushes: number;
  totalWorkflowRuns: number;
  storageBytesUsed: number;
}

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [lastRollupTime, setLastRollupTime] = useState<string | null>(null);
  const [range, setRange] = useState("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTriggeringRollup, setIsTriggeringRollup] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/analytics?range=${range}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load analytics metrics.");
      }

      const data = await response.json();
      setMetrics(data.metrics || []);
      setLastRollupTime(data.lastRollupTime);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [range]);

  const triggerRollup = async () => {
    setIsTriggeringRollup(true);
    try {
      const response = await fetch("/api/v1/admin/analytics/rollup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to run aggregation rollup.");
      }

      fetchMetrics();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsTriggeringRollup(false);
    }
  };

  const formatStorage = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + " MB";
  };

  // Reusable responsive SVG line chart
  const renderLineChart = (
    title: string,
    data: number[],
    labels: string[],
    color: string,
    yFormatter: (val: number) => string = (val) => String(val)
  ) => {
    if (data.length === 0) return <div className="text-gray-400 text-xs py-xl">No chart data available.</div>;

    const width = 500;
    const height = 180;
    const padding = 30;

    const min = 0;
    const max = Math.max(...data, 1) * 1.1; // Add padding at the top

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / (max - min)) * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");

    return (
      <Card className="bg-[#161B22] border-[#30363D] p-md rounded-sm text-left flex flex-col gap-sm">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-400">{title}</h4>
        <div className="relative w-full h-[180px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Grids */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#232830" strokeDasharray="3,3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#232830" strokeDasharray="3,3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#30363D" />

            {/* Path */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              points={points}
            />

            {/* End point dot */}
            {data.length > 0 && (
              <circle
                cx={padding + (data.length - 1) / (data.length - 1 || 1) * (width - padding * 2)}
                cy={height - padding - ((data[data.length - 1] - min) / (max - min)) * (height - padding * 2)}
                r="4"
                fill={color}
              />
            )}
          </svg>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>{labels[0] || "Start"}</span>
          <span>{labels[labels.length - 1] || "End"}</span>
        </div>
      </Card>
    );
  };

  const dates = metrics.map((m) => new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }));

  return (
    <div className="flex flex-col gap-lg text-gray-200">
      
      {/* Header and Controls */}
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-white mb-xs">
            Platform Analytics
          </h1>
          <p className="text-gray-400 text-xs">
            {lastRollupTime ? `Rollup data as of ${new Date(lastRollupTime).toLocaleString()}` : "Loading rollup data..."}
          </p>
        </div>

        <div className="flex items-center gap-xs">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-[#161B22] border border-[#30363D] text-white text-xs px-sm py-xs rounded-sm"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <Button
            onClick={triggerRollup}
            disabled={isTriggeringRollup}
            className="bg-primary hover:bg-primary/90 text-white text-xs px-md py-xs rounded-sm font-semibold"
          >
            {isTriggeringRollup ? "Aggregating..." : "Run Rollup Now"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-gray-400">Loading daily metrics...</div>
      ) : error ? (
        <div className="p-md bg-error/10 border border-error text-error text-sm rounded-sm">{error}</div>
      ) : metrics.length === 0 ? (
        <Card className="bg-[#161B22] border-[#30363D] p-xl rounded-sm text-center">
          <span className="text-3xl">📊</span>
          <h3 className="font-sans text-lg font-bold text-white mt-sm">No analytics metrics found</h3>
          <p className="text-gray-400 text-xs mt-xxs">
            Run the daily rollup aggregator job to calculate and generate platform analytics metrics.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          
          {/* User Growth */}
          {renderLineChart(
            "Total Users Growth",
            metrics.map((m) => m.totalUsers),
            dates,
            "#58A6FF"
          )}

          {/* Repo Growth */}
          {renderLineChart(
            "Total Repositories Growth",
            metrics.map((m) => m.totalRepositories),
            dates,
            "#7C5CFF"
          )}

          {/* Activity Trends */}
          {renderLineChart(
            "Git Push Activity Daily",
            metrics.map((m) => m.totalPushes),
            dates,
            "#39D353"
          )}

          {/* Storage usage */}
          {renderLineChart(
            "Platform Storage Footprint",
            metrics.map((m) => m.storageBytesUsed),
            dates,
            "#FF8C00",
            (val) => formatStorage(val)
          )}

        </div>
      )}

    </div>
  );
}
