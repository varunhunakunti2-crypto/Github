"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, Button, Input, Label } from "@gitforge/ui";

export default function NewOrganizationPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [slugAvailable, setSlugAvailable] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Debounced Slug Check
  useEffect(() => {
    if (!slug) {
      setSlugError("");
      setSlugAvailable(false);
      return;
    }

    // Client-side format validation: only lowercase alphanumeric, hyphens
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      setSlugError("Slug must contain only lowercase alphanumeric characters and hyphens (-).");
      setSlugAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      setSlugError("");
      setSlugAvailable(false);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `/api/v1/organizations/check-slug/${slug}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            setSlugAvailable(true);
          } else {
            setSlugError(`The organization slug "${slug}" is already taken.`);
          }
        } else {
          setSlugError("Could not verify slug availability.");
        }
      } catch (err) {
        console.warn("Could not verify slug availability", err);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  // Handle name input change to auto-suggest slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    
    // Auto-suggest slug
    const suggestedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, "") // remove special chars
      .replace(/\s+/g, "-"); // replace spaces with hyphens
    setSlug(suggestedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !billingEmail || slugError || isCheckingSlug || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setGlobalError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ name, slug, billingEmail }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to create organization.");
      }

      const data = await res.json();
      router.push(`/orgs/${data.slug}`);
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto py-3xl px-lg">
      <div className="mb-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-xs font-sans text-xs text-body hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>

      <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
        <div>Phase 20: Organization Creation</div>
        <div>Creator automatically becomes OWNER</div>
      </div>

      <Card className="bg-canvas-soft border-hairline text-ink p-xl rounded-sm shadow-none flex flex-col gap-lg">
        <div className="flex items-center gap-sm">
          <Building className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h1 className="font-sans text-2xl font-bold tracking-tight">
              Create a new organization
            </h1>
            <p className="font-sans text-body text-xs">
              Collaborate on repositories, manage teams, and set up billing.
            </p>
          </div>
        </div>

        {globalError && (
          <div className="p-sm bg-error/10 border border-error text-error text-sm rounded-sm font-sans flex items-center gap-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <Label htmlFor="org-name" className="text-body font-sans text-xs">
              Organization Name
            </Label>
            <Input
              id="org-name"
              type="text"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={handleNameChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="org-slug" className="text-body font-sans text-xs">
              Organization Slug (URL identifier)
            </Label>
            <div className="relative">
              <Input
                id="org-slug"
                type="text"
                placeholder="e.g. acme-corp"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                disabled={isSubmitting}
                required
                error={!!slugError}
                className="pr-xl"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {isCheckingSlug && <Loader2 className="w-4 h-4 text-body animate-spin" />}
                {!isCheckingSlug && slugAvailable && <CheckCircle className="w-4 h-4 text-success" />}
                {!isCheckingSlug && slugError && <AlertCircle className="w-4 h-4 text-error" />}
              </div>
            </div>
            {slugError && (
              <span className="font-sans text-[11px] text-error mt-1 leading-relaxed">
                {slugError}
              </span>
            )}
            {!slugError && slugAvailable && (
              <span className="font-sans text-[11px] text-success mt-1 leading-relaxed">
                Slug is available! Your organization will be at: gitforge.dev/orgs/{slug}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="billing-email" className="text-body font-sans text-xs">
              Billing Email (Separate from your personal email)
            </Label>
            <Input
              id="billing-email"
              type="email"
              placeholder="e.g. billing@acme.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex flex-col gap-xs mt-sm">
            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center gap-xs font-semibold"
              disabled={isSubmitting || isCheckingSlug || !name || !slug || !billingEmail || !!slugError}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Organization
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
