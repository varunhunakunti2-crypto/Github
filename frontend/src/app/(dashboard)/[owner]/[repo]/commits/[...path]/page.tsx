'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface CommitDto {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  parents: string[];
}

export default function RepoCommitsPage({ params }: { params: Promise<{ owner: string; repo: string; path: string[] }> }) {
  // Extracting from promise must be done with React.use in client components.
  // Wait, this is a 'use client' file.
  // Next.js 15 says to use React.use(params) in client components.
  const { owner, repo, path } = React.use(params);
  
  const currentRef = path[0];
  const currentPath = path.slice(1).join('/');

  const [commits, setCommits] = useState<CommitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorUsers, setAuthorUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchCommits() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/commits?ref=${currentRef}&path=${currentPath}`);
        if (!res.ok) throw new Error('Failed to fetch commits');
        const data = await res.json();
        setCommits(data);
        
        // Fetch user profiles for unique emails
        if (data.length > 0) {
          const uniqueEmails = Array.from(new Set(data.map((c: CommitDto) => c.authorEmail)));
          Promise.all(uniqueEmails.map((email: unknown) => 
            fetch(`/api/v1/users/lookup/${encodeURIComponent(email as string)}`)
              .then(res => res.ok ? res.json() : { username: null })
              .then(user => ({ email: email as string, username: user.username }))
              .catch(() => ({ email: email as string, username: null }))
          )).then(results => {
            const map: Record<string, string> = {};
            results.forEach(r => { if (r.username) map[r.email] = r.username; });
            setAuthorUsers(map);
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCommits();
  }, [owner, repo, currentRef, currentPath]);

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  const groupedCommits: { dateLabel: string; commits: CommitDto[] }[] = [];
  commits.forEach(commit => {
    const dateObj = new Date(commit.date);
    const dateLabel = `Commits on ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    if (groupedCommits.length === 0 || groupedCommits[groupedCommits.length - 1].dateLabel !== dateLabel) {
      groupedCommits.push({ dateLabel, commits: [commit] });
    } else {
      groupedCommits[groupedCommits.length - 1].commits.push(commit);
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-200">
          History for <span className="font-mono text-gray-400">{currentPath || 'repository'}</span>
        </h2>
        <div className="font-mono text-sm text-blue-400 flex items-center gap-1">
          <Link href={`/${owner}/${repo}/tree/${currentRef}`} className="hover:underline">
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
      </div>

      <div className="border border-[#232830] rounded-md bg-[#0B0D10] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Loading commits...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">Error: {error}</div>
        ) : commits.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No commits found for this path.</div>
        ) : (
          <div className="flex flex-col">
            {groupedCommits.map(group => (
              <div key={group.dateLabel} className="flex flex-col">
                <div className="px-4 py-2 bg-[#14171C] text-xs font-bold text-gray-400 border-b border-[#232830]">
                  {group.dateLabel}
                </div>
                <div className="divide-y divide-[#232830]">
                  {group.commits.map((commit) => (
                    <div key={commit.hash} className="p-4 flex items-start justify-between hover:bg-[#1C2026] transition bg-[#0B0D10]">
                      <div className="flex flex-col gap-1">
                        <Link 
                          href={`/${owner}/${repo}/commit/${commit.hash}`}
                          className="font-semibold text-gray-200 hover:text-blue-400 hover:underline"
                        >
                          {commit.message.split('\n')[0]}
                        </Link>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          {authorUsers[commit.authorEmail] ? (
                            <Link href={`/${authorUsers[commit.authorEmail]}`} className="font-medium text-blue-400 hover:underline">
                              {commit.authorName}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-400">{commit.authorName}</span>
                          )}
                          <span>committed on</span>
                          <span title={new Date(commit.date).toLocaleString()}>
                            {new Date(commit.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => navigator.clipboard.writeText(commit.hash)}
                          className="text-gray-500 hover:text-gray-300"
                          title="Copy full SHA"
                        >
                          📋
                        </button>
                        <Link 
                          href={`/${owner}/${repo}/commit/${commit.hash}`}
                          className="font-mono text-sm px-2 py-1 bg-[#232830] text-blue-400 rounded hover:bg-gray-700 transition"
                        >
                          {commit.hash.substring(0, 7)}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
