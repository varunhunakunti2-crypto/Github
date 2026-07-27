'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ForkButton from './ForkButton';

export function RepoHeader({ owner, repo }: { owner: string; repo: string }) {
  const pathname = usePathname();
  const [cloneUrl, setCloneUrl] = useState(`https://github.com/${owner}/${repo}.git`);
  const [protocol, setProtocol] = useState<'HTTPS' | 'SSH'>('HTTPS');

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
          </div>
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
