"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Label } from "@gitforge/ui";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    global?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!identifier) {
      newErrors.identifier = "Email or Username is required";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/v1/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      if (response.status === 428) {
        // 2FA required custom response
        const data = await response.json().catch(() => ({}));
        const challengeToken = data.challenge_token || "mock_challenge_token_123";
        sessionStorage.setItem("challenge_token", challengeToken);
        router.push(`/two-factor?challenge_token=${challengeToken}`);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Invalid username/email or password.");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/");
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: "github" | "google") => {
    // Navigate to OAuth endpoint
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  return (
    <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-text-muted border border-border bg-base p-xs rounded-sm">
        <div>Auth-Step: login</div>
        <div>State: authenticate</div>
      </div>

      <h1 className="font-space-grotesk text-3xl font-bold mb-md tracking-tight">
        Sign in to GitForge
      </h1>

      {errors.global && (
        <div className="mb-md p-sm bg-danger/10 border border-danger text-danger text-sm rounded-sm font-inter">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="identifier" className="text-text-muted font-space-grotesk">
            Username or Email address
          </Label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!errors.identifier}
            placeholder="e.g. appi or appi@example.com"
            disabled={isLoading}
            autoComplete="username"
          />
          {errors.identifier && (
            <span className="text-danger text-xs mt-1 font-inter">{errors.identifier}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-text-muted font-space-grotesk">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!errors.password}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="current-password"
          />
          {errors.password && (
            <span className="text-danger text-xs mt-1 font-inter">{errors.password}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent/90 text-white w-full rounded-sm font-space-grotesk font-semibold py-sm mt-xs transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="relative my-lg flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <span className="relative bg-surface px-sm text-xs text-text-muted uppercase font-mono">
          Or continue with
        </span>
      </div>

      <div className="flex flex-col gap-sm">
        <Button
          type="button"
          onClick={() => handleOAuth("github")}
          disabled={isLoading}
          className="bg-base hover:bg-border text-text-primary border border-border w-full rounded-sm font-space-grotesk font-medium py-xs transition-colors focus:ring-2 focus:ring-accent"
        >
          <svg className="w-4 h-4 mr-2 inline-block fill-current" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </Button>
        <Button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={isLoading}
          className="bg-base hover:bg-border text-text-primary border border-border w-full rounded-sm font-space-grotesk font-medium py-xs transition-colors focus:ring-2 focus:ring-accent"
        >
          <svg className="w-4 h-4 mr-2 inline-block fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.19-2.772-6.19-6.182s2.78-6.182 6.19-6.182c1.47 0 2.822.508 3.89 1.487l3.228-3.228C18.847 2.185 15.714 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.776 0 10.748-4.103 10.748-11.24 0-.693-.066-1.375-.187-1.955H12.24z" />
          </svg>
          Google
        </Button>
      </div>

      <div className="mt-lg text-left text-sm text-text-muted">
        Don't have an account?{" "}
        <Link
          href="/signup"
          className="text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
        >
          Sign Up
        </Link>
      </div>
    </Card>
  );
}
