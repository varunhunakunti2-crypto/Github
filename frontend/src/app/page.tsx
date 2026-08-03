import React from "react";
import Link from "next/link";
import { Button, Card } from "@gitforge/ui";
import {
  Github,
  GitBranch,
  GitPullRequest,
  Shield,
  Terminal,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas selection:bg-primary selection:text-on-primary">
      {/* Sticky Navigation – top-nav per DESIGN.md */}
      <header className="sticky top-0 z-50 w-full h-[56px] border-b border-hairline bg-canvas/90 backdrop-blur-md px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Github className="w-5 h-5 text-primary" />
          <span className="font-sans font-semibold text-[16px] tracking-tight text-ink">
            GitForge
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="font-sans text-[14px] text-mute hover:text-ink transition-colors"
          >
            Features
          </a>
          <a
            href="#"
            className="font-sans text-[14px] text-mute hover:text-ink transition-colors"
          >
            Docs
          </a>
          <a
            href="#"
            className="font-sans text-[14px] text-mute hover:text-ink transition-colors"
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="secondary-sm">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary-sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6 py-24 md:py-32">
        <div className="relative z-10 max-w-[800px] text-center flex flex-col items-center gap-6">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 bg-canvas-soft border border-hairline px-3 py-1.5 rounded-pill text-[13px] font-medium tracking-[0.4px] text-mute">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            GitForge Cloud is now in public beta
          </div>

          <h1 className="font-sans text-[36px] md:text-[56px] font-semibold leading-[1.10] tracking-[-1.8px] text-ink max-w-[650px] mt-2">
            Build and ship code, together.
          </h1>

          <p className="font-sans text-[16px] md:text-[18px] text-body max-w-[550px] leading-[1.50] tracking-[-0.1px]">
            GitForge provides high-performance repository hosting,
            collaborative code reviews, and sub-100ms repository loads —
            all in a quietly luxurious dark interface.
          </p>

          <div className="flex items-center gap-3 mt-4">
            <Link href="/signup">
              <Button variant="primary" className="gap-2">
                Start Building <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="secondary">Read Docs</Button>
          </div>
        </div>
      </main>

      {/* Feature Grid Section – feature-card per DESIGN.md */}
      <section id="features" className="border-t border-hairline py-20 px-6 md:px-8 bg-canvas">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-12">
          <div className="text-center md:text-left max-w-[500px] flex flex-col gap-3">
            <span className="font-sans text-[13px] font-medium text-primary uppercase tracking-[0.4px]">
              Platform Core
            </span>
            <h2 className="font-sans text-[28px] md:text-[40px] font-semibold tracking-[-1.0px] leading-[1.15] text-ink">
              Speed and isolation, built for modern builders.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-canvas-soft border border-hairline rounded-lg p-lg flex flex-col gap-4 hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all duration-200">
              <div className="w-10 h-10 rounded-md bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-[22px] font-medium tracking-[-0.4px] text-ink">
                Smart SSH Engine
              </h3>
              <p className="font-sans text-[14px] text-body leading-[1.50]">
                Connect your git operations seamlessly via local SSH keys,
                providing blazing-fast repo clones and pushes.
              </p>
            </div>

            <div className="bg-canvas-soft border border-hairline rounded-lg p-lg flex flex-col gap-4 hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all duration-200">
              <div className="w-10 h-10 rounded-md bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-[22px] font-medium tracking-[-0.4px] text-ink">
                Stark Code Reviews
              </h3>
              <p className="font-sans text-[14px] text-body leading-[1.50]">
                Review branch differences line by line in our sleek,
                distraction-free pull request panel.
              </p>
            </div>

            <div className="bg-canvas-soft border border-hairline rounded-lg p-lg flex flex-col gap-4 hover:bg-canvas-soft-2 hover:border-hairline-strong transition-all duration-200">
              <div className="w-10 h-10 rounded-md bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-[22px] font-medium tracking-[-0.4px] text-ink">
                RBAC Key Protection
              </h3>
              <p className="font-sans text-[14px] text-body leading-[1.50]">
                Block force pushes and lock down main branches with granular
                permission controls for teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer – per DESIGN.md footer spec */}
      <footer className="border-t border-hairline py-16 px-6 md:px-8 bg-canvas text-mute text-[12px]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Github className="w-4 h-4 text-primary" />
            <span className="font-sans font-semibold text-ink text-[14px]">GitForge</span>
            <span>
              &copy; 2026 GitForge. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-ink transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-ink transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-ink transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
