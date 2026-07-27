'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DeleteFileButton } from '../editor/DeleteFileButton';

interface FileViewerProps {
  owner: string;
  repo: string;
  currentRef: string;
  currentPath: string;
}

export function FileViewer({ owner, repo, currentRef, currentPath }: FileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // We map the blob path to an API call. In a real system, we'd need to resolve the path 
  // to a blob hash first, or have an endpoint that takes a path directly (like /api/v1/repos/.../contents/... )
  
  useEffect(() => {
    async function fetchFile() {
      try {
        setLoading(true);
        // Using a mock implementation since the backend getBlob currently expects a hash.
        // We'll simulate fetching the raw content directly.
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/raw/${currentRef}/${currentPath}`);
        if (!res.ok) throw new Error('Failed to fetch file content');
        
        const text = await res.text();
        setContent(text);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFile();
  }, [owner, repo, currentRef, currentPath]);

  const breadcrumbs = currentPath.split('/').filter(Boolean);
  const fileName = breadcrumbs[breadcrumbs.length - 1];
  const isMarkdown = fileName?.endsWith('.md');
  const isImage = fileName?.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);

  // Very naive large file check for the sake of the exercise
  const isLarge = content.length > 100000;

  return (
    <div className="border border-[#232830] rounded-md bg-[#0B0D10] overflow-hidden mt-4">
      <div className="bg-[#14171C] px-4 py-3 flex items-center justify-between border-b border-[#232830]">
        <div className="font-mono text-sm text-blue-400 flex items-center gap-1">
          <Link href={`/${owner}/${repo}/tree/${currentRef}`} className="font-bold hover:underline">
            {repo}
          </Link>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const partialPath = breadcrumbs.slice(0, idx + 1).join('/');
            return (
              <React.Fragment key={partialPath}>
                <span className="text-gray-500">/</span>
                <Link 
                  href={`/${owner}/${repo}/${isLast ? 'blob' : 'tree'}/${currentRef}/${partialPath}`} 
                  className={`hover:underline ${isLast ? 'text-gray-200 font-bold' : ''}`}
                >
                  {crumb}
                </Link>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex gap-2 items-center">
          <Link 
            href={`/${owner}/${repo}/edit/${currentRef}/${currentPath}`}
            className="text-xs px-2 py-1 bg-[#232830] text-gray-200 rounded-md hover:bg-gray-700 transition"
          >
            Edit
          </Link>
          <a 
            href={`/api/v1/repos/${owner}/${repo}/raw/${currentRef}/${currentPath}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-2 py-1 bg-[#232830] text-gray-200 rounded-md hover:bg-gray-700 transition"
          >
            Raw
          </a>
          <Link 
            href={`/${owner}/${repo}/commits/${currentRef}/${currentPath}`} 
            className="text-xs px-2 py-1 bg-[#232830] text-gray-200 rounded-md hover:bg-gray-700 transition"
          >
            History
          </Link>
          <DeleteFileButton 
            owner={owner}
            repo={repo}
            currentRef={currentRef}
            currentPath={currentPath}
          />
        </div>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading file...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">Error: {error}</div>
        ) : isLarge ? (
          <div className="p-8 text-center text-gray-400">
            <p>This file is too large to render inline.</p>
            <a href={`/api/v1/repos/${owner}/${repo}/raw/${currentRef}/${currentPath}`} className="mt-4 inline-block text-blue-400 hover:underline">View Raw</a>
          </div>
        ) : isImage ? (
          <div className="p-8 flex justify-center bg-[#0B0D10]">
            <img src={`/api/v1/repos/${owner}/${repo}/raw/${currentRef}/${currentPath}`} alt={fileName} className="max-w-full rounded-md shadow-lg" />
          </div>
        ) : (
          <div className="overflow-x-auto bg-[#0B0D10]">
            {isMarkdown ? (
              <div className="p-6 prose prose-invert max-w-none">
                {/* Normally we'd use a markdown renderer here like ReactMarkdown */}
                <pre className="font-mono text-sm text-gray-300">{content}</pre>
              </div>
            ) : (
              <table className="w-full font-mono text-sm border-collapse">
                <tbody>
                  {content.split('\n').map((line, idx) => (
                    <tr key={idx} id={`L${idx + 1}`} className="hover:bg-[#14171C] target:bg-[rgba(124,92,255,0.2)] target:border-l-2 target:border-[#7C5CFF] group">
                      <td className="w-12 pr-4 text-right text-gray-600 select-none border-r border-[#232830]">
                        <a href={`#L${idx + 1}`} className="hover:text-gray-400">{idx + 1}</a>
                      </td>
                      <td className="pl-4 whitespace-pre text-gray-300">
                        {line || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
