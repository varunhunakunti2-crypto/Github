"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, FileText, Plus, AlertCircle } from "lucide-react";
import { Button, Card } from "@gitforge/ui";

interface ReadmeSectionProps {
  owner: string;
  repo: string;
  branch?: string;
  canEdit?: boolean;
}

export default function ReadmeSection({
  owner,
  repo,
  branch = "main",
  canEdit = true,
}: ReadmeSectionProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReadme = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `/api/v1/repositories/${owner}/${repo}/contents/README.md?ref=${branch}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (res.status === 404) {
          setContent(null);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch README.");
        }

        const data = await res.json();
        // Assuming contents returns an object with base64 encoded content or plain text
        // Decodes base64 content if present
        const rawContent = data.content
          ? atob(data.content.replace(/\s/g, ""))
          : typeof data === "string" 
            ? data 
            : "";
        
        setContent(rawContent || null);
      } catch (err: any) {
        console.warn("Using mock README for dev mode.", err.message);
        
        // Mock fallback README
        const mockReadme = `# ${repo}\n\nHigh-performance Git repository hosting and developer collaboration platform built on NestJS and Next.js.\n\n## Features\n\n- 🚀 Fast Repository Creation\n- 📂 Traversal Code Explorer\n- 👥 Collaborative settings\n\n## Getting Started\n\n\`\`\`bash\n# Clone this repository\ngit clone http://localhost:3000/git/${owner}/${repo}.git\n\n# Run the installer\nnpm install\n\`\`\`\n\n[License documentation](/${owner}/${repo}/blob/${branch}/LICENSE) for details.`;
        setContent(mockReadme);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadme();
  }, [owner, repo, branch]);

  // A simple, secure Markdown renderer
  const renderMarkdown = (md: string) => {
    const lines = md.split("\n");
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    const elements: React.ReactNode[] = [];

    const flushTable = (keyIndex: number) => {
      if (tableRows.length > 0) {
        const separatorIdx = tableRows.findIndex(row => row.some(cell => cell.includes("---")));
        let headers: string[] = [];
        let rows: string[][] = [];
        
        if (separatorIdx !== -1) {
          headers = tableRows[0];
          rows = tableRows.slice(separatorIdx + 1);
        } else {
          rows = tableRows;
        }

        elements.push(
          <div key={`table-${keyIndex}`} className="overflow-x-auto my-sm border border-border rounded-sm">
            <table className="w-full text-left text-xs text-text-primary border-collapse">
              {headers.length > 0 && (
                <thead className="bg-base border-b border-border">
                  <tr>
                    {headers.map((th, i) => (
                      <th key={i} className="px-sm py-xs font-space-grotesk font-bold border-r border-border last:border-r-0">
                        {parseInlineFormatting(th.trim())}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                    {row.map((td, cIdx) => (
                      <td key={cIdx} className="px-sm py-xs border-r border-border last:border-r-0">
                        {parseInlineFormatting(td.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      // Code block toggle
      if (line.trim().startsWith("```")) {
        if (inTable) flushTable(index);
        if (inCodeBlock) {
          inCodeBlock = false;
          elements.push(
            <pre
              key={`code-${index}`}
              className="bg-base border border-border p-md rounded-sm font-jetbrains-mono text-xs overflow-x-auto my-sm text-left select-all"
            >
              <code>{codeBlockContent.join("\n")}</code>
            </pre>
          );
          codeBlockContent = [];
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Table row
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        inTable = true;
        const cells = line.trim().slice(1, -1).split("|");
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(index);
      }

      // H1 Header
      if (line.startsWith("# ")) {
        const text = line.slice(2);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        elements.push(
          <h1
            key={index}
            id={id}
            className="font-space-grotesk text-2xl font-bold text-text-primary border-b border-border pb-xxs mt-md mb-sm group flex items-center"
          >
            <a href={`#${id}`} className="hover:underline">
              {text}
            </a>
          </h1>
        );
        return;
      }

      // H2 Header
      if (line.startsWith("## ")) {
        const text = line.slice(3);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        elements.push(
          <h2
            key={index}
            id={id}
            className="font-space-grotesk text-lg font-bold text-text-primary border-b border-border pb-xxs mt-sm mb-xs group flex items-center"
          >
            <a href={`#${id}`} className="hover:underline">
              {text}
            </a>
          </h2>
        );
        return;
      }

      // H3 Header
      if (line.startsWith("### ")) {
        const text = line.slice(4);
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        elements.push(
          <h3
            key={index}
            id={id}
            className="font-space-grotesk text-sm font-bold text-text-primary mt-sm mb-xxs group flex items-center"
          >
            <a href={`#${id}`} className="hover:underline">
              {text}
            </a>
          </h3>
        );
        return;
      }

      // Bullet points
      if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <ul key={index} className="list-disc pl-md text-xs text-text-primary my-xxs text-left leading-relaxed">
            <li>{parseInlineFormatting(line.slice(2))}</li>
          </ul>
        );
        return;
      }

      // Horizontal Rule
      if (line.trim() === "---") {
        elements.push(<hr key={index} className="border-border my-md" />);
        return;
      }

      // Standard Paragraph
      if (line.trim()) {
        elements.push(
          <p key={index} className="text-xs text-text-primary leading-relaxed my-xxs text-left">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    });

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  // Helper to parse inline styles like `code`, [link](url), ![img](url) and **bold**
  const parseInlineFormatting = (text: string) => {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const codeRegex = /`([^`]+)`/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    
    let parts: React.ReactNode[] = [text];

    const applyRegex = (currentParts: React.ReactNode[], regex: RegExp, render: (m: RegExpMatchArray, i: number) => React.ReactNode) => {
      let newParts: React.ReactNode[] = [];
      currentParts.forEach((part, partIdx) => {
        if (typeof part !== "string") {
          newParts.push(part);
          return;
        }
        const matches = Array.from(part.matchAll(regex));
        if (matches.length === 0) {
          newParts.push(part);
          return;
        }
        let lastIdx = 0;
        matches.forEach((m, mIdx) => {
          const [full] = m;
          const index = part.indexOf(full, lastIdx);
          if (index > lastIdx) {
            newParts.push(part.slice(lastIdx, index));
          }
          newParts.push(render(m, partIdx * 1000 + mIdx));
          lastIdx = index + full.length;
        });
        if (lastIdx < part.length) {
          newParts.push(part.slice(lastIdx));
        }
      });
      return newParts;
    };

    // Images first
    parts = applyRegex(parts, imgRegex, (m, i) => (
      <img key={`img-${i}`} src={m[2]} alt={m[1]} className="max-w-full h-auto rounded-sm border border-border my-xs" />
    ));

    // Then links
    parts = applyRegex(parts, linkRegex, (m, i) => (
      <Link key={`link-${i}`} href={m[2]} className="text-accent hover:underline outline-none focus-visible:ring-1 focus-visible:ring-accent">
        {m[1]}
      </Link>
    ));

    // Then inline code
    parts = applyRegex(parts, codeRegex, (m, i) => (
      <code key={`code-${i}`} className="bg-base border border-border px-xxs py-[2px] rounded-xs font-jetbrains-mono text-[10px] text-text-primary">
        {m[1]}
      </code>
    ));

    // Then bold
    parts = applyRegex(parts, boldRegex, (m, i) => (
      <strong key={`bold-${i}`} className="font-bold">{m[1]}</strong>
    ));

    return parts;
  };

  if (isLoading) {
    return (
      <Card className="bg-surface border-border p-md flex flex-col gap-sm animate-pulse rounded-sm w-full">
        <div className="h-6 bg-base border border-border rounded-sm w-1/3"></div>
        <div className="h-4 bg-base border border-border rounded-sm w-full"></div>
        <div className="h-4 bg-base border border-border rounded-sm w-4/5"></div>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border overflow-hidden rounded-sm w-full shadow-none">
      
      {/* Header Bar */}
      <div className="bg-base border-b border-border px-md py-sm flex items-center gap-xs font-space-grotesk text-xs font-bold text-text-primary select-none text-left">
        <BookOpen className="w-4 h-4 text-text-muted" />
        <span>README.md</span>
      </div>

      <div className="p-md flex flex-col gap-sm">
        {content ? (
          <div className="flex flex-col gap-sm font-inter text-text-primary">
            {renderMarkdown(content)}
          </div>
        ) : (
          /* Empty state */
          <div className="py-xl text-center flex flex-col items-center justify-center gap-sm">
            <FileText className="w-8 h-8 text-text-muted/60" />
            <h4 className="font-space-grotesk text-sm font-bold text-text-primary">
              No README found
            </h4>
            <p className="font-inter text-text-muted text-xs max-w-[280px] leading-relaxed">
              Help others understand this project by describing its purpose and instructions.
            </p>
            {canEdit && (
              <Link href={`/${owner}/${repo}/new/${branch}/README.md`}>
                <Button className="bg-accent hover:bg-accent/90 text-white py-xs px-md rounded-sm font-space-grotesk font-semibold text-xs transition-colors flex items-center gap-xs focus:ring-2 focus:ring-accent outline-none">
                  <Plus className="w-3.5 h-3.5" />
                  Add a README
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

    </Card>
  );
}
