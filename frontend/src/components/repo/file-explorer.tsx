'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UploadFilesPanel } from '../editor/UploadFilesPanel';
import { useRouter } from 'next/navigation';

interface FileNode {
  type: 'blob' | 'tree' | 'commit';
  name: string;
  path: string;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  lastCommitHash?: string;
}

interface FileExplorerProps {
  owner: string;
  repo: string;
  currentRef: string;
  currentPath: string;
}

export function FileExplorer({ owner, repo, currentRef, currentPath }: FileExplorerProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    async function fetchTree() {
      try {
        setLoading(true);
        // We fetch from our backend
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/tree?ref=${currentRef}&path=${currentPath}`);
        if (!res.ok) throw new Error('Failed to fetch tree');
        const data = await res.json();
        setEntries(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTree();
  }, [owner, repo, currentRef, currentPath]);

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="border border-[#232830] rounded-md bg-[#0B0D10] overflow-hidden mt-4">
      <div className="bg-[#14171C] px-4 py-3 flex items-center justify-between border-b border-[#232830]">
        <div className="font-mono text-sm text-blue-400 flex items-center gap-1">
          <Link href={`/${owner}/${repo}/tree/${currentRef}`} className="font-bold hover:underline">
            {repo}
          </Link>
          {breadcrumbs.map((crumb, idx) => {
            const partialPath = breadcrumbs.slice(0, idx + 1).join('/');
            return (
              <React.Fragment key={partialPath}>
                <span className="text-gray-500">/</span>
                <Link href={`/${owner}/${repo}/tree/${currentRef}/${partialPath}`} className="hover:underline">
                  {crumb}
                </Link>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const name = prompt('Enter name of the new file:');
              if (name) {
                const fullNewPath = currentPath ? `${currentPath}/${name}` : name;
                router.push(`/${owner}/${repo}/edit/${currentRef}/${fullNewPath}`);
              }
            }}
            className="text-xs px-2.5 py-1 bg-[#232830] text-gray-300 rounded hover:bg-gray-700 transition"
          >
            + New File
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="text-xs px-2.5 py-1 bg-[#232830] text-gray-300 rounded hover:bg-gray-700 transition"
          >
            Upload Files
          </button>
          <Link 
            href={`/${owner}/${repo}/commits/${currentRef}/${currentPath}`} 
            className="text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1"
          >
            <span>🕒</span> History
          </Link>
        </div>
      </div>

      <div className="flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading files...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">Error: {error}</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">This directory is empty.</div>
        ) : (
          entries.map((entry) => (
            <div 
              key={entry.name}
              className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:py-2 border-b border-[#232830] last:border-b-0 hover:bg-[#14171C] transition-colors gap-1 sm:gap-0"
            >
              <div className="flex items-center gap-3 w-full sm:w-1/3">
                <span className="text-gray-500 w-4 flex justify-center shrink-0">
                  {entry.type === 'tree' ? '📁' : '📄'}
                </span>
                <Link 
                  href={`/${owner}/${repo}/${entry.type === 'tree' ? 'tree' : 'blob'}/${currentRef}/${entry.path}`}
                  className="text-sm text-gray-200 hover:text-blue-400 font-mono truncate"
                >
                  {entry.name}
                </Link>
              </div>

              <div className="flex-1 pl-7 sm:px-4 truncate text-sm text-gray-500 w-full">
                {entry.lastCommitMessage ? (
                  <Link href={`/${owner}/${repo}/commit/${entry.lastCommitHash}`} className="hover:text-blue-400 hover:underline truncate block w-full">
                    {entry.lastCommitMessage}
                  </Link>
                ) : (
                  <span className="italic">No commit info</span>
                )}
              </div>

              <div className="text-xs sm:text-sm text-gray-500 pl-7 sm:pl-0 sm:w-32 sm:text-right shrink-0">
                {entry.lastCommitDate ? new Date(entry.lastCommitDate).toLocaleDateString() : ''}
              </div>
            </div>
          ))
        )}
      </div>

      <UploadFilesPanel 
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        owner={owner}
        repo={repo}
        currentRef={currentRef}
        onSuccess={() => {
          setShowUpload(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
