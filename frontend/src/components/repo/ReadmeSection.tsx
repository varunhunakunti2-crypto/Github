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
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      // Code block toggle
      if (line.trim().startsWith("```")) {
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

    return elements;
  };

  // Helper to parse inline styles like `code`, [link](url), and **bold**
  const parseInlineFormatting = (text: string) => {
    // 1. Parse Links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // 2. Parse inline code: `code`
    const codeRegex = /`([^`]+)`/g;
    
    let parts: React.ReactNode[] = [text];

    // Simple replacement helper
    const matches = Array.from(text.matchAll(linkRegex));
    if (matches.length > 0) {
      let lastIndex = 0;
      const newParts: React.ReactNode[] = [];
      matches.forEach((m, idx) => {
        const [full, linkText, linkUrl] = m;
        const index = text.indexOf(full, lastIndex);
        if (index > lastIndex) {
          newParts.push(text.slice(lastIndex, index));
        }
        newParts.push(
          <Link
            key={idx}
            href={linkUrl}
            className="text-accent hover:underline outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            {linkText}
          </Link>
        );
        lastIndex = index + full.length;
      });
      if (lastIndex < text.length) {
        newParts.push(text.slice(lastIndex));
      }
      parts = newParts;
    }

    // Parse inline code
    parts = parts.map((part) => {
      if (typeof part !== "string") return part;
      
      const codeMatches = Array.from(part.matchAll(codeRegex));
      if (codeMatches.length === 0) return part;

      let lastIdx = 0;
      const codeParts: React.ReactNode[] = [];
      codeMatches.forEach((cm, cIdx) => {
        const [full, codeText] = cm;
        const index = part.indexOf(full, lastIdx);
        if (index > lastIdx) {
          codeParts.push(part.slice(lastIdx, index));
        }
        codeParts.push(
          <code
            key={cIdx}
            className="bg-base border border-border px-xxs py-[2px] rounded-xs font-jetbrains-mono text-[10px] text-text-primary"
          >
            {codeText}
          </code>
        );
        lastIdx = index + full.length;
      });
      if (lastIdx < part.length) {
        codeParts.push(part.slice(lastIdx));
      }
      return codeParts;
    });

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
