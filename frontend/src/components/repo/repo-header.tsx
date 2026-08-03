'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ForkButton from './ForkButton';

export function RepoHeader({ owner, repo }: { owner: string; repo: string }) {
  const pathname = usePathname();
  const [cloneUrl, setCloneUrl] = useState(`https://github.com/${owner}/${repo}.git`);
  const [protocol, setProtocol] = useState<'HTTPS' | 'SSH'>('HTTPS');
  
  // Reporting states
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDescription, setReportDescription] = useState("");

  const submitReport = async () => {
    try {
      const response = await fetch("/api/v1/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          reportedType: "repository",
          reportedId: `${owner}/${repo}`,
          reason: reportReason,
          description: reportDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report.");
      }

      alert("Repository reported successfully. An administrator will review your report.");
      setIsReporting(false);
      setReportDescription("");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const tabs = [
    { name: 'Code', href: `/${owner}/${repo}`, icon: '📝' },
    { name: 'Issues', href: `/${owner}/${repo}/issues`, icon: '⚠️' },
    { name: 'Pull Requests', href: `/${owner}/${repo}/pulls`, icon: '🔄' },
    { name: 'Actions', href: `/${owner}/${repo}/actions`, icon: '▶️' },
    { name: 'Projects', href: `/${owner}/${repo}/projects`, icon: '📋' },
    { name: 'Wiki', href: `/${owner}/${repo}/wiki`, icon: '📖' },
    { name: 'Settings', href: `/${owner}/${repo}/settings`, icon: '⚙️' },
  ];

  return (
    <div className="bg-[#14171C] border-b border-[#232830] pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-mono flex items-center gap-2">
            <span className="text-gray-400">
              <Link href={`/${owner}`} className="hover:underline hover:text-blue-400">{owner}</Link>
            </span>
            <span className="text-gray-500">/</span>
            <span className="font-bold text-white">
              <Link href={`/${owner}/${repo}`} className="hover:underline hover:text-blue-400">{repo}</Link>
            </span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full border border-[#232830] text-gray-400 font-sans">
              Public
            </span>
          </h1>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#232830] border border-gray-600 rounded-md hover:bg-gray-700">
              <span>👁️</span> Watch
              <span className="px-2 py-0.5 ml-1 text-xs bg-[#14171C] rounded-full">1</span>
            </button>
            
            <ForkButton owner={owner} repo={repo} forksCount={42} />

            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#232830] border border-gray-600 rounded-md hover:bg-gray-700">
              <span>⭐</span> Star
              <span className="px-2 py-0.5 ml-1 text-xs bg-[#14171C] rounded-full">128</span>
            </button>

            <button
              onClick={() => setIsReporting(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#F85149] bg-[#232830] border border-gray-600 rounded-md hover:bg-gray-700"
            >
              <span>🚩</span> Report
            </button>
          </div>

          {isReporting && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
              <div className="bg-[#161B22] border border-[#30363D] p-6 max-w-md w-full rounded-md text-left flex flex-col gap-4 font-sans text-gray-200">
                <h3 className="text-lg font-bold text-white">Report Repository</h3>
                <p className="text-xs text-gray-400">
                  Submit a report for {owner}/{repo}. Administrators will review this report.
                </p>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Reason:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="bg-[#0D1117] border border-[#30363D] text-white text-xs px-2 py-1.5 rounded-md"
                  >
                    <option value="spam">Spam / Advertising</option>
                    <option value="abuse">Harassment / Abuse</option>
                    <option value="copyright">Copyright Violation</option>
                    <option value="malware">Malware / Phishing</option>
                    <option value="other">Other Violation</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Description:</label>
                  <textarea
                    placeholder="Provide details about the policy violation..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="bg-[#0D1117] border border-[#30363D] text-white text-xs px-3 py-2 rounded-md h-20 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setIsReporting(false);
                      setReportDescription("");
                    }}
                    className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-4 py-2 border border-[#30363D] rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReport}
                    className="bg-[#F85149] hover:bg-[#D9383A] text-white text-xs px-4 py-2 rounded-md font-semibold"
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive 
                    ? 'border-[#7C5CFF] text-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
