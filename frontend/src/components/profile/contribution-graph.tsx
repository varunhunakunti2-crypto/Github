"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@gitforge/ui";
import { ContributionGraphData, ContributionDay } from "@gitforge/types";

interface ContributionGraphProps {
  username: string;
}

export default function ContributionGraph({ username }: ContributionGraphProps) {
  const [graphData, setGraphData] = useState<ContributionGraphData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Custom tooltip state
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Generate historical year choices
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    const fetchContributions = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(
          `/api/v1/users/${username}/contributions?year=${selectedYear}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load contributions graph.");
        }

        const data = await response.json();
        setGraphData(data);
      } catch (err: any) {
        // Fallback to locally generated mock data if backend has no route yet
        console.warn("Using mock contribution data:", err.message);
        generateMockData(selectedYear);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributions();
  }, [username, selectedYear]);

  // Generates 365/366 days of mock contributions aligned to selected year
  const generateMockData = (year: number) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const days: ContributionDay[] = [];
    let total = 0;

    // Aligns starting index so the first column matches Sunday
    const current = new Date(startDate);
    const startDayOfWeek = current.getDay();
    if (startDayOfWeek > 0) {
      current.setDate(current.getDate() - startDayOfWeek);
    }

    while (current <= endDate) {
      // Mock contributions: mostly 0, occasionally higher
      const rand = Math.random();
      let count = 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;

      if (rand > 0.85) {
        count = Math.floor(Math.random() * 8) + 1;
        level = count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4;
      } else if (rand > 0.7) {
        count = 1;
        level = 1;
      }

      total += count;
      days.push({
        date: current.toISOString().split("T")[0],
        count,
        level,
      });

      current.setDate(current.getDate() + 1);
    }

    setGraphData({
      total_contributions: total,
      days,
    });
  };

  // Maps level to accent color transparency
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "rgba(124, 92, 255, 0.25)"; // 25% signal
      case 2:
        return "rgba(124, 92, 255, 0.5)";  // 50% signal
      case 3:
        return "rgba(124, 92, 255, 0.75)"; // 75% signal
      case 4:
        return "rgba(124, 92, 255, 1)";    // 100% signal
      case 0:
      default:
        return "#232830";                   // border color
    }
  };

  const handleMouseMove = (e: React.MouseEvent, day: ContributionDay) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredDay(day);
    setTooltipPos({
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top - 36 + window.scrollY,
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-surface border-border p-md rounded-sm animate-pulse w-full">
        <div className="h-6 bg-base border border-border rounded-sm w-48 mb-md"></div>
        <div className="h-28 bg-base border border-border rounded-sm w-full"></div>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border text-text-primary p-md rounded-sm shadow-none flex flex-col gap-sm w-full text-left relative">
      
      {/* Top Header stats & Year Selector */}
      <div className="flex justify-between items-center flex-wrap gap-xs">
        <div>
          <span className="font-space-grotesk text-sm font-bold text-text-muted">
            Contributions Graph
          </span>
          <h3 className="font-jetbrains-mono text-xl font-bold mt-xxs">
            {graphData?.total_contributions || 0}{" "}
            <span className="font-inter text-xs text-text-muted font-normal">
              contributions in {selectedYear}
            </span>
          </h3>
        </div>

        {/* Year Dropdown */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="appearance-none h-8 pl-sm pr-lg bg-base border border-border text-xs font-semibold rounded-sm outline-none focus:border-accent text-text-primary cursor-pointer font-sans"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-text-muted">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Heatmap Grid Wrapper (horizontally scrolls on small screens) */}
      <div className="overflow-x-auto pb-xs scrollbar-thin">
        <div className="min-w-[650px] flex gap-xs pt-xs">
          
          {/* Days of week labels */}
          <div className="grid grid-rows-7 text-[10px] text-text-muted font-mono h-[88px] pr-xs pt-1 justify-between select-none">
            <span>Sun</span>
            <span></span>
            <span>Tue</span>
            <span></span>
            <span>Thu</span>
            <span></span>
            <span>Sat</span>
          </div>

          {/* Grid Layout (53 cols, 7 rows) */}
          <div className="flex-1 flex flex-col gap-xxs">
            <div className="grid grid-flow-col grid-rows-7 gap-[3px] auto-cols-max h-[88px]">
              {graphData?.days.map((day) => (
                <div
                  key={day.date}
                  onMouseEnter={(e) => handleMouseMove(e, day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{ backgroundColor: getLevelColor(day.level) }}
                  className="w-2.5 h-2.5 rounded-xs transition-colors hover:ring-1 hover:ring-accent cursor-pointer"
                />
              ))}
            </div>

            {/* Months labels */}
            <div className="flex justify-between text-[10px] text-text-muted font-mono select-none pr-md mt-xs">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Legend */}
      <div className="flex items-center gap-xs justify-end text-[10px] text-text-muted font-mono select-none pt-xs">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-xs bg-[#232830]"></div>
        <div className="w-2.5 h-2.5 rounded-xs bg-[rgba(124,92,255,0.25)]"></div>
        <div className="w-2.5 h-2.5 rounded-xs bg-[rgba(124,92,255,0.5)]"></div>
        <div className="w-2.5 h-2.5 rounded-xs bg-[rgba(124,92,255,0.75)]"></div>
        <div className="w-2.5 h-2.5 rounded-xs bg-[rgba(124,92,255,1)]"></div>
        <span>More</span>
      </div>

      {/* Floating Tooltip portal/overlay */}
      {hoveredDay && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipPos.x - 70}px`,
            top: `${tooltipPos.y + 110}px`,
            zIndex: 50,
          }}
          className="bg-surface border border-border text-[10px] font-mono text-text-primary px-sm py-xxs rounded-xs shadow-lg pointer-events-none whitespace-nowrap"
        >
          <div className="font-semibold text-accent">
            {hoveredDay.count} contributions
          </div>
          <div className="text-text-muted mt-xxs">
            {new Date(hoveredDay.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
