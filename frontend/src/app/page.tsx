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
    <div className="flex flex-col min-h-screen bg-canvas-soft selection:bg-primary selection:text-on-primary">
      {/* Sticky Navigation */}
      <header className="sticky top-0 z-50 w-full h-[64px] border-b border-hairline bg-canvas/80 backdrop-blur-md px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Symbol */}
          <Github className="w-6 h-6 text-accent" />
          <span className="font-sans font-semibold text-[16px] tracking-tight">
            GitForge
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a
            href="#"
            className="font-sans text-[14px] text-body hover:text-ink transition-colors"
          >
            Features
          </a>
          <a
            href="#"
            className="font-sans text-[14px] text-body hover:text-ink transition-colors"
          >
            Docs
          </a>
          <a
            href="#"
            className="font-sans text-[14px] text-body hover:text-ink transition-colors"
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="secondary-sm">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary-sm">Sign Up</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6 py-24 md:py-32">
        {/* Mesh Atmospheric Gradient Backdrop */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[400px] bg-gradient-to-r from-gradient-develop-start via-gradient-preview-start to-gradient-ship-end opacity-20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-[800px] text-center flex flex-col items-center gap-6">
          {/* Mono Badge */}
          <div className="flex items-center gap-2 bg-canvas-soft-2 border border-hairline px-3 py-1 rounded-pill text-[12px] font-mono text-body">
            <span className="flex h-2 w-2 rounded-full bg-link-blue animate-pulse" />
            GitForge Cloud is now in public beta
          </div>

          <h1 className="font-sans text-[36px] md:text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink max-w-[650px] mt-2">
            Build and deploy on the AI Cloud.
          </h1>

          <p className="font-sans text-[16px] md:text-[18px] text-body max-w-[550px] leading-relaxed">
            GitForge provides the speed of Vercel with high-performance
            repository hosting, collaborative reviews, and sub-100ms repository
            loads.
          </p>

          <div className="flex items-center gap-4 mt-4">
            <Link href="/signup">
              <Button variant="primary" className="gap-2">
                Start Deploying <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="secondary">Read Docs</Button>
          </div>
        </div>
      </main>

      {/* Feature Grid Section */}
      <section className="border-t border-hairline py-20 px-6 md:px-8 bg-canvas">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-12">
          <div className="text-center md:text-left max-w-[500px] flex flex-col gap-3">
            <span className="font-mono text-[12px] text-link-blue uppercase tracking-widest">
              Platform Core
            </span>
            <h2 className="font-sans text-[28px] md:text-[36px] font-semibold tracking-tight text-ink">
              Speed and isolation, built for modern builders.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card
              elevation={3}
              className="flex flex-col gap-4 border border-hairline"
            >
              <div className="w-10 h-10 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-[18px] font-semibold text-ink">
                Smart SSH Engine
              </h3>
              <p className="font-sans text-[14px] text-body leading-relaxed">
                Connect your git operations seamlessly via local SSH keys,
                providing blazing-fast repo clones and pushes.
              </p>
            </Card>

            <Card
              elevation={3}
              className="flex flex-col gap-4 border border-hairline"
            >
              <div className="w-10 h-10 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-[18px] font-semibold text-ink">
                Stark Code Reviews
              </h3>
              <p className="font-sans text-[14px] text-body leading-relaxed">
                Review branch differences line by line in our sleek,
                distraction-free pull request panel.
              </p>
            </Card>

            <Card
              elevation={3}
              className="flex flex-col gap-4 border border-hairline"
            >
              <div className="w-10 h-10 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-sans text-[18px] font-semibold text-ink">
                RBAC Key Protection
              </h3>
              <p className="font-sans text-[14px] text-body leading-relaxed">
                Block force pushes and lock down main branches with granular
                permission controls for teams.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-12 px-6 md:px-8 bg-canvas-soft text-body text-[14px]">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-primary rounded-xs flex items-center justify-center text-on-primary font-mono text-[10px] font-bold">
              F
            </div>
            <span className="font-sans font-semibold text-ink">GitForge</span>
            <span className="text-[12px] text-mute">
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
