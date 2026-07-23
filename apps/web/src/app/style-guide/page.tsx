"use client";

import React, { useState } from "react";
import {
  Button,
  IconButtonCircular,
  Card,
  CardMarketing,
  CardMarketingLarge,
  CardSoft,
  TemplateCard,
  CodeEditorMockup,
  PricingCard,
  PricingCardFeatured,
  Input,
  Textarea,
  Select,
  Label,
  Checkbox,
  NavBar,
  NavLink,
  Footer,
  Sidebar,
  SidebarRow,
  Modal,
  Dropdown,
  DropdownItem,
  Toast,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Banner,
  LinkInline,
  cn,
} from "@gitforge/ui";
import {
  Sun,
  Moon,
  Terminal,
  GitBranch,
  GitPullRequest,
  Shield,
  Settings,
  User,
  Database,
  Key,
  Lock,
  ArrowRight,
  Info,
  Check,
  AlertTriangle,
  AlertCircle,
  Play,
  RotateCcw,
  ChevronDown,
  X,
} from "lucide-react";

export default function StyleGuidePage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("web-apps");
  const [toasts, setToasts] = useState<
    Array<{
      id: number;
      message: string;
      type: "success" | "info" | "warning" | "error";
    }>
  >([]);
  const [inputText, setInputText] = useState("");
  const [selectVal, setSelectVal] = useState("default");
  const [checked, setChecked] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const addToast = (
    type: "success" | "info" | "warning" | "error",
    msg: string,
  ) => {
    setToasts((prev) => [...prev, { id: Date.now(), message: msg, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const codeExample = `export default function handler(req, res) {
  res.status(200).json({ 
    message: "Delivered from the AI Edge Cloud",
    latency: "8ms",
    region: "sfo1"
  });
}`;

  return (
    <div className="min-h-screen bg-canvas-soft text-ink transition-colors duration-300">
      {/* Dynamic Toast Portal */}
      <div className="fixed bottom-6 right-6 z-150 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            description="Visual confirmation from design system."
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>

      {/* Nav header */}
      <NavBar
        logo={
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-primary rounded-xs flex items-center justify-center text-on-primary font-mono text-[14px] font-bold">
              DS
            </div>
            <span className="font-sans font-semibold text-[16px] tracking-tight">
              GitForge System
            </span>
          </div>
        }
        links={[
          { href: "#tokens", label: "Design Tokens", active: true },
          { href: "#components", label: "Component Library" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="nav-ask-ai"
              onClick={toggleTheme}
              className="gap-2"
            >
              {theme === "light" ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5" />
              )}
              Toggle Theme
            </Button>
            <Button variant="nav-signup" onClick={() => setIsModalOpen(true)}>
              Launch Sandbox
            </Button>
          </div>
        }
      />

      <div className="max-w-[1400px] mx-auto px-6 py-12 flex flex-col gap-16">
        {/* Style Guide Intro */}
        <section className="flex flex-col gap-4 max-w-[800px]">
          <Banner className="w-fit">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            GitForge Living Style Guide &mdash; v1.0.0-alpha
          </Banner>
          <h1 className="font-display-xl text-ink">GitForge Design System.</h1>
          <p className="font-body-lg text-body">
            A developer-platform identity characterized by a stark
            ink-and-canvas duet, geometric sans typography, monospaced labels
            for technical context, and high-fidelity mesh gradients at hero
            scale.
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TOKENS SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section
          id="tokens"
          className="flex flex-col gap-8 border-t border-hairline pt-12"
        >
          <div className="flex flex-col gap-1.5">
            <span className="font-caption-mono text-link uppercase tracking-wider font-semibold">
              Section 01
            </span>
            <h2 className="font-display-lg text-ink">Design Tokens</h2>
            <p className="font-body-md text-body">
              Direct representation of variables parsed from DESIGN.md.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Color Palette Grid */}
            <Card elevation={2} className="flex flex-col gap-6">
              <h3 className="font-display-sm text-ink border-b border-hairline pb-3">
                Color Palette
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    name: "Canvas",
                    var: "bg-canvas",
                    val: "canvas",
                    desc: "Card / modal surface",
                  },
                  {
                    name: "Canvas Soft",
                    var: "bg-canvas-soft",
                    val: "canvas-soft",
                    desc: "Default page body",
                  },
                  {
                    name: "Canvas Soft 2",
                    var: "bg-canvas-soft-2",
                    val: "canvas-soft-2",
                    desc: "Inner inset background",
                  },
                  {
                    name: "Ink / Primary",
                    var: "bg-primary text-on-primary",
                    val: "primary",
                    desc: "Core text / primary CTA",
                  },
                  {
                    name: "Hairline",
                    var: "border border-hairline bg-canvas",
                    val: "hairline",
                    desc: "1px border / divider",
                  },
                  {
                    name: "Hairline Strong",
                    var: "border border-hairline-strong bg-canvas",
                    val: "hairline-strong",
                    desc: "Strong divider / mute text",
                  },
                  {
                    name: "Link Blue",
                    var: "bg-link",
                    val: "link",
                    desc: "Primary blue link",
                  },
                  {
                    name: "Link Bg Soft",
                    var: "bg-link-bg-soft",
                    val: "link-bg-soft",
                    desc: "Information backgrounds",
                  },
                  {
                    name: "Success",
                    var: "bg-success",
                    val: "success",
                    desc: "Standard success color",
                  },
                  {
                    name: "Error",
                    var: "bg-error",
                    val: "error",
                    desc: "Validation red",
                  },
                  {
                    name: "Warning",
                    var: "bg-warning",
                    val: "warning",
                    desc: "Caution yellow",
                  },
                  {
                    name: "Violet",
                    var: "bg-violet",
                    val: "violet",
                    desc: "Developer purple",
                  },
                  {
                    name: "Cyan",
                    var: "bg-cyan",
                    val: "cyan",
                    desc: "Mint accent",
                  },
                  {
                    name: "Highlight Pink",
                    var: "bg-highlight-pink",
                    val: "highlight-pink",
                    desc: "High-sat pink stop",
                  },
                ].map((color, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-2 border border-hairline rounded-sm bg-canvas-soft/55"
                  >
                    <div
                      className={`h-12 w-full rounded-sm flex items-center justify-center font-caption-mono text-[10px] ${color.var}`}
                    >
                      {color.val}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-sans font-semibold text-[13px] text-ink">
                        {color.name}
                      </span>
                      <span className="font-caption text-mute text-[11px] leading-tight">
                        {color.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gradients */}
              <div className="flex flex-col gap-4 mt-2">
                <span className="font-caption-mono text-mute uppercase tracking-wider text-[11px] font-semibold">
                  Mesh & Brand Gradients
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-md bg-gradient-to-r from-gradient-develop-start to-gradient-develop-end text-white font-caption-mono text-[12px] flex items-end h-16 shadow-level-1">
                    Develop Gradient
                  </div>
                  <div className="p-3 rounded-md bg-gradient-to-r from-gradient-preview-start to-gradient-preview-end text-white font-caption-mono text-[12px] flex items-end h-16 shadow-level-1">
                    Preview Gradient
                  </div>
                  <div className="p-3 rounded-md bg-gradient-to-r from-gradient-ship-start to-gradient-ship-end text-white font-caption-mono text-[12px] flex items-end h-16 shadow-level-1">
                    Ship Gradient
                  </div>
                </div>
              </div>
            </Card>

            {/* Typography Hierarchy */}
            <Card elevation={2} className="flex flex-col gap-6">
              <h3 className="font-display-sm text-ink border-b border-hairline pb-3">
                Typography System
              </h3>
              <div className="flex flex-col gap-4 divide-y divide-hairline">
                {[
                  {
                    name: "display-xl",
                    class: "font-display-xl",
                    spec: "48px / Semibold / -2.4px",
                    sample: "AI Cloud.",
                  },
                  {
                    name: "display-lg",
                    class: "font-display-lg",
                    spec: "32px / Semibold / -1.28px",
                    sample: "Your frontend, delivered.",
                  },
                  {
                    name: "display-md",
                    class: "font-display-md",
                    spec: "24px / Semibold / -0.96px",
                    sample: "Compute model.",
                  },
                  {
                    name: "body-lg",
                    class: "font-body-lg",
                    spec: "18px / Regular / 28px lh",
                    sample:
                      "Lead paragraph describing core developer concepts.",
                  },
                  {
                    name: "body-md",
                    class: "font-body-md",
                    spec: "16px / Regular / 24px lh",
                    sample: "Standard body text content for readability.",
                  },
                  {
                    name: "body-sm",
                    class: "font-body-sm",
                    spec: "14px / Regular / -0.28px",
                    sample: "Secondary descriptions, navigation and buttons.",
                  },
                  {
                    name: "caption-mono",
                    class: "font-caption-mono",
                    spec: "12px / Monospace / uppercase",
                    sample: "PLATFORM CORE",
                  },
                  {
                    name: "code",
                    class: "font-code",
                    spec: "13px / Monospace / 20px lh",
                    sample: 'git commit -m "feat: design tokens"',
                  },
                ].map((type, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4 first:pt-0"
                  >
                    <div className="flex flex-col gap-0.5 shrink-0 w-44">
                      <span className="font-caption-mono text-ink font-semibold text-[13px]">
                        {type.name}
                      </span>
                      <span className="font-caption text-mute text-[11px]">
                        {type.spec}
                      </span>
                    </div>
                    <div className={cn("text-ink leading-tight", type.class)}>
                      {type.sample}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Spacing, Radius, and Shadow Tokens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card elevation={2} className="flex flex-col gap-4">
              <h3 className="font-display-sm text-ink border-b border-hairline pb-2">
                Spacing Scale
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { name: "xxs (4px)", size: "h-1 w-4" },
                  { name: "xs (8px)", size: "h-2 w-8" },
                  { name: "sm (12px)", size: "h-3 w-12" },
                  { name: "md (16px)", size: "h-4 w-16" },
                  { name: "lg (24px)", size: "h-5 w-24" },
                  { name: "xl (32px)", size: "h-6 w-32" },
                  { name: "2xl (40px)", size: "h-7 w-40" },
                  { name: "3xl (48px)", size: "h-8 w-48" },
                ].map((space, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-body"
                  >
                    <span className="font-caption-mono text-[12px]">
                      {space.name}
                    </span>
                    <div className={`bg-primary rounded-xs ${space.size}`} />
                  </div>
                ))}
              </div>
            </Card>

            <Card elevation={2} className="flex flex-col gap-4">
              <h3 className="font-display-sm text-ink border-b border-hairline pb-2">
                Border Radius
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "xs (4px)", class: "rounded-xs" },
                  { name: "sm (6px)", class: "rounded-sm" },
                  { name: "md (8px)", class: "rounded-md" },
                  { name: "lg (12px)", class: "rounded-lg" },
                  { name: "pill-sm (64px)", class: "rounded-pill-sm" },
                  { name: "pill (100px)", class: "rounded-pill" },
                ].map((rad, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center gap-2 p-2 border border-hairline rounded-sm bg-canvas-soft-2/50 text-[12px] font-caption-mono"
                  >
                    <div className={`w-full h-12 bg-primary ${rad.class}`} />
                    <span>{rad.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card elevation={2} className="flex flex-col gap-4">
              <h3 className="font-display-sm text-ink border-b border-hairline pb-2">
                Elevation (Shadows)
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Level 1: Inset", class: "shadow-level-1" },
                  { name: "Level 2: Subtle Drop", class: "shadow-level-2" },
                  { name: "Level 3: Soft Stack", class: "shadow-level-3" },
                  { name: "Level 4: Float Stack", class: "shadow-level-4" },
                  { name: "Level 5: Modal", class: "shadow-level-5" },
                ].map((shadow, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-md bg-canvas border border-hairline font-caption-mono text-[12px] text-ink flex items-center justify-between transition-colors",
                      shadow.class,
                    )}
                  >
                    <span>{shadow.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COMPONENTS SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section
          id="components"
          className="flex flex-col gap-12 border-t border-hairline pt-12"
        >
          <div className="flex flex-col gap-1.5">
            <span className="font-caption-mono text-link uppercase tracking-wider font-semibold">
              Section 02
            </span>
            <h2 className="font-display-lg text-ink">Component Library</h2>
            <p className="font-body-md text-body">
              Fully reusable states, variants, and configurations mapping the
              specification rules.
            </p>
          </div>

          {/* Buttons Category */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Buttons & CTAs</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Variants & States
              </span>
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Primary Button
                </span>
                <Button variant="primary">Deploy Code</Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Secondary Button
                </span>
                <Button variant="secondary">Cancel Action</Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Primary Small
                </span>
                <Button variant="primary-sm">Log In</Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Secondary Small
                </span>
                <Button variant="secondary-sm">Log In</Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Nav Signup
                </span>
                <Button variant="nav-signup">Sign Up</Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Nav Login
                </span>
                <Button variant="nav-login">Log In</Button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Nav Ask AI
                </span>
                <Button variant="nav-ask-ai">Ask AI</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 items-center border-t border-hairline/60 pt-4">
              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Circular IconButton
                </span>
                <IconButtonCircular
                  onClick={() => addToast("info", "Arrow CTA trigger clicked!")}
                >
                  <ArrowRight className="w-4 h-4 text-ink" />
                </IconButtonCircular>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Tab Ghost (Centered Selection)
                </span>
                <div className="flex bg-canvas-soft-2 p-1 rounded-pill-sm border border-hairline">
                  {["web-apps", "ai-apps", "ecommerce"].map((tab) => (
                    <Button
                      key={tab}
                      variant="tab-ghost"
                      className={cn(
                        activeTab === tab &&
                          "bg-canvas text-ink shadow-level-2 font-medium",
                      )}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.replace("-", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-caption-mono text-mute text-[11px]">
                  Disabled State
                </span>
                <Button variant="primary" disabled>
                  Locked State
                </Button>
              </div>
            </div>
          </div>

          {/* Cards Category */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Cards & Containers</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Marketing & App Chrome
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardMarketing>
                <div className="flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <h4 className="font-display-sm text-ink">Smart SSH Engine</h4>
                  <p className="font-body-sm text-body">
                    Connect your git operations seamlessly via local SSH keys,
                    providing blazing-fast repo clones and pushes.
                  </p>
                </div>
              </CardMarketing>

              <CardMarketingLarge>
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-sm bg-canvas-soft-2 flex items-center justify-center text-ink border border-hairline shadow-level-2">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="font-display-md text-ink">
                    Stark Permissions
                  </h4>
                  <p className="font-body-md text-body">
                    Granular role-based access controls, key validation, and
                    secure branch protections built for collaborative
                    enterprises.
                  </p>
                  <Button variant="primary-sm" className="w-fit gap-2">
                    Manage Policies <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardMarketingLarge>

              <CardSoft>
                <div className="flex flex-col gap-3">
                  <span className="font-caption-mono text-link uppercase tracking-wider font-semibold">
                    Beta Spotlight
                  </span>
                  <h4 className="font-display-sm text-ink">
                    AI Cloud Deployment
                  </h4>
                  <p className="font-body-sm text-body">
                    Integrate your Next.js project directly to serverless
                    functions operating in global edge nodes with instant build
                    caches.
                  </p>
                </div>
              </CardSoft>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              <TemplateCard
                title="Next.js App Router Clean Template"
                framework="Next.js"
                onClick={() =>
                  addToast("success", "Selected Next.js Template!")
                }
              />
              <CodeEditorMockup
                filename="api/v1/deploy.js"
                code={codeExample}
              />
            </div>

            {/* Pricing Section Chrome */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <PricingCard
                tierName="Hobby"
                price="$0"
                description="For personal portfolios and small web experiments."
                cta={
                  <Button variant="secondary-sm" className="w-full">
                    Sign Up Free
                  </Button>
                }
                features={[
                  "Standard git repos over HTTP & SSH",
                  "3 team members invitation",
                  "Free analytics integration",
                ]}
              />
              <PricingCardFeatured
                tierName="Pro"
                price="$20"
                description="Collaborative workspace with premium speed & safety."
                cta={
                  <Button variant="secondary-sm" className="w-full">
                    Get Started Pro
                  </Button>
                }
                features={[
                  "Everything in Hobby tier",
                  "Unlimited repositories & collaborators",
                  "Branch protection and reviews",
                  "Git LFS integration with MinIO",
                ]}
              />
            </div>
          </div>

          {/* Forms & Inputs Category */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Forms & Inputs</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Primitives & Validation
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="input-sm">Small Input (32px)</Label>
                  <Input
                    id="input-sm"
                    sizeVariant="sm"
                    placeholder="Enter email address..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="input-md">Medium Input (40px)</Label>
                  <Input
                    id="input-md"
                    sizeVariant="md"
                    placeholder="Enter username..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="input-lg">Large Input (48px)</Label>
                  <Input
                    id="input-lg"
                    sizeVariant="lg"
                    placeholder="Deploy endpoint query..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="select-box">Dropdown Selection</Label>
                  <Select
                    id="select-box"
                    value={selectVal}
                    onChange={(e) => setSelectVal(e.target.value)}
                  >
                    <option value="default">Select deployment tier...</option>
                    <option value="hobby">Hobby tier</option>
                    <option value="pro">Pro plan</option>
                  </Select>
                </div>
                <div className="flex items-center gap-2.5 mt-6 border border-hairline p-3 rounded-sm bg-canvas-soft/40 select-none">
                  <Checkbox
                    id="policy-chk"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                  <Label htmlFor="policy-chk" className="cursor-pointer">
                    I accept the terms and conditions
                  </Label>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="comments">Additional Meta Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Describe repository description..."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="error-input" className="text-error">
                    Validation Error Input
                  </Label>
                  <Input
                    id="error-input"
                    error
                    placeholder="Wrong token verification..."
                  />
                  <span className="font-sans text-[12px] text-error flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Token credential
                    expired
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Category */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Navigation Elements</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Header, Sidebar, & Footer
              </span>
            </h3>

            {/* Sidebar Mockup Container */}
            <div className="flex border border-hairline rounded-md overflow-hidden bg-canvas h-96 shadow-level-2">
              <Sidebar>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-hairline/60 mb-2">
                  <div className="w-5 h-5 rounded-xs bg-primary flex items-center justify-center text-on-primary font-mono text-[10px]">
                    GF
                  </div>
                  <span className="font-sans font-semibold text-[14px]">
                    GitForge Project
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <SidebarRow active>
                    <Database className="w-4 h-4 text-ink shrink-0" />
                    <span>Repositories</span>
                  </SidebarRow>
                  <SidebarRow>
                    <GitPullRequest className="w-4 h-4 text-body shrink-0 group-hover:text-ink" />
                    <span>Pull Requests</span>
                  </SidebarRow>
                  <SidebarRow>
                    <GitBranch className="w-4 h-4 text-body shrink-0 group-hover:text-ink" />
                    <span>Branch Policies</span>
                  </SidebarRow>
                  <SidebarRow>
                    <Key className="w-4 h-4 text-body shrink-0 group-hover:text-ink" />
                    <span>SSH Keys</span>
                  </SidebarRow>
                  <SidebarRow>
                    <Settings className="w-4 h-4 text-body shrink-0 group-hover:text-ink" />
                    <span>Settings</span>
                  </SidebarRow>
                </div>
              </Sidebar>

              {/* Context canvas panel */}
              <div className="flex-1 p-6 bg-canvas-soft-2 flex flex-col gap-4 overflow-y-auto">
                <span className="font-caption-mono text-mute">
                  Console sandbox preview
                </span>
                <div className="h-full border border-dashed border-hairline-strong/30 rounded-md flex items-center justify-center text-mute font-sans text-sm">
                  Main Workspace Canvas
                </div>
              </div>
            </div>

            {/* Render Footer Mockup */}
            <div className="border border-hairline rounded-md overflow-hidden shadow-level-2">
              <Footer
                logo={
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary rounded-xs flex items-center justify-center text-on-primary font-mono text-[11px] font-bold">
                      F
                    </div>
                    <span className="font-sans font-semibold text-ink">
                      GitForge
                    </span>
                  </div>
                }
                columns={[
                  {
                    title: "Features",
                    links: [
                      { href: "#", label: "Hosting" },
                      { href: "#", label: "Actions CI/CD" },
                      { href: "#", label: "LFS Storage" },
                    ],
                  },
                  {
                    title: "Resources",
                    links: [
                      { href: "#", label: "Documentation" },
                      { href: "#", label: "Discussions" },
                      { href: "#", label: "API Reference" },
                    ],
                  },
                  {
                    title: "Company",
                    links: [
                      { href: "#", label: "About Us" },
                      { href: "#", label: "Blog" },
                      { href: "#", label: "Careers" },
                    ],
                  },
                  {
                    title: "Security",
                    links: [
                      { href: "#", label: "Compliance" },
                      { href: "#", label: "Auditing" },
                      { href: "#", label: "Status" },
                    ],
                  },
                ]}
                copyright="&copy; 2026 GitForge. All rights reserved."
              />
            </div>
          </div>

          {/* Overlays / Popups & Modals */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Modals, Dropdowns & Toasts</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Interactive Overlays
              </span>
            </h3>

            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Modal Overlay
              </Button>

              <Dropdown
                trigger={
                  <Button variant="secondary" className="gap-2">
                    Options <ChevronDown className="w-4 h-4 text-mute" />
                  </Button>
                }
              >
                <DropdownItem
                  onClick={() => addToast("info", "Clicked user profile!")}
                >
                  <User className="w-3.5 h-3.5 inline mr-2" /> Profile settings
                </DropdownItem>
                <DropdownItem
                  onClick={() =>
                    addToast("warning", "Locked branch configurations!")
                  }
                >
                  <Lock className="w-3.5 h-3.5 inline mr-2" /> Security policies
                </DropdownItem>
                <div className="h-px bg-hairline my-1" />
                <DropdownItem
                  onClick={() =>
                    addToast("error", "Initiating logout protocol...")
                  }
                  className="text-error hover:bg-error-soft hover:text-error-deep"
                >
                  <X className="w-3.5 h-3.5 inline mr-2" /> Logout Session
                </DropdownItem>
              </Dropdown>

              <Button
                variant="secondary"
                onClick={() =>
                  addToast("success", "Build pipeline triggered successfully!")
                }
                className="gap-2"
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  addToast(
                    "error",
                    "Build pipeline failed: Syntax error inside deploy.js.",
                  )
                }
                className="gap-2"
              >
                Trigger Error Toast
              </Button>
            </div>

            {/* Modal Dialog */}
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Delete Repository"
              description="This action is permanent and cannot be reversed."
              footerActions={
                <>
                  <Button
                    variant="secondary-sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary-sm"
                    className="bg-error text-white hover:bg-error-deep border-none"
                    onClick={() => {
                      setIsModalOpen(false);
                      addToast("error", "Repository purged permanently.");
                    }}
                  >
                    Purge Repo
                  </Button>
                </>
              }
            >
              <p className="font-sans text-sm text-body">
                Are you sure you want to delete the repository{" "}
                <strong className="text-ink">gitforge-prototype</strong>? All
                branch policies, issue tickets, and stored LFS files will be
                removed from our cluster.
              </p>
            </Modal>
          </div>

          {/* Tables Category */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Data Tables</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Ex-Data-Table Spec
              </span>
            </h3>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Repository</TableHeaderCell>
                  <TableHeaderCell>Branch</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Commit Hash</TableHeaderCell>
                  <TableHeaderCell>Timestamp</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    repo: "gitforge-core",
                    branch: "main",
                    status: "success",
                    tag: "Live",
                    hash: "fb73a19",
                    time: "8m ago",
                  },
                  {
                    repo: "gitforge-ui",
                    branch: "release-1.2",
                    status: "warning",
                    tag: "Pending",
                    hash: "e018ba2",
                    time: "1h ago",
                  },
                  {
                    repo: "next-mockups",
                    branch: "feature/auth-mfa",
                    status: "error",
                    tag: "Failed",
                    hash: "80df50a",
                    time: "3h ago",
                  },
                  {
                    repo: "lfs-cluster-minio",
                    branch: "main",
                    status: "success",
                    tag: "Live",
                    hash: "900b127",
                    time: "1d ago",
                  },
                ].map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-ink">
                      {row.repo}
                    </TableCell>
                    <TableCell>
                      <span className="font-code text-[12px] bg-canvas-soft-2 border border-hairline px-2 py-0.5 rounded-sm">
                        {row.branch}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status as any}>{row.tag}</Badge>
                    </TableCell>
                    <TableCell className="font-code text-[12px] text-mute">
                      {row.hash}
                    </TableCell>
                    <TableCell>{row.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Semantic Indicators / Icons & Badges */}
          <div className="flex flex-col gap-6">
            <h3 className="font-display-sm text-ink border-b border-hairline pb-2 flex items-center justify-between">
              <span>Inline Badges & Semantics</span>
              <span className="font-caption-mono text-[12px] text-mute font-normal">
                Metadata Indicators
              </span>
            </h3>

            <div className="flex flex-wrap gap-4 items-center">
              <Badge variant="secondary">secondary</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="error">error</Badge>
              <Badge variant="violet">violet</Badge>
              <LinkInline href="#inline-link">Inline blueprint link</LinkInline>
              <Banner>
                <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                Banner marketing capsule &mdash; checkout new packages
              </Banner>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
