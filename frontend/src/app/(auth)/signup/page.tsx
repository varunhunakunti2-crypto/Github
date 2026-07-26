"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Button, Input, Label } from "@gitforge/ui";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    global?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!username) {
      newErrors.username = "Username is required";
    } else if (username.length < 3 || username.length > 39) {
      newErrors.username = "Username must be between 3 and 39 characters";
    } else if (!/^[a-zA-Z0-9-]+$/.test(username)) {
      newErrors.username = "Username can only contain alphanumeric characters and hyphens";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const response = await fetch("/api/v1/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Sign up failed. Please try again.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-text-muted border border-border bg-base p-xs rounded-sm">
          <div>Auth-Step: signup</div>
          <div>State: verification-sent</div>
        </div>
        <h2 className="font-space-grotesk text-2xl font-bold mb-sm text-success">
          Account Created
        </h2>
        <p className="font-inter text-text-muted text-sm mb-md">
          A verification link has been sent to <span className="font-mono text-text-primary">{email}</span>. Please check your inbox and follow the link to activate your account.
        </p>
        <Link href="/login" className="inline-block w-full text-center text-sm font-medium text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm">
          Return to Sign In
        </Link>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
      {/* Signature monospace commit trailer block */}
      <div className="mb-md font-mono text-[12px] text-text-muted border border-border bg-base p-xs rounded-sm">
        <div>Auth-Step: signup</div>
        <div>State: new-account</div>
      </div>

      <h1 className="font-space-grotesk text-3xl font-bold mb-md tracking-tight">
        Create your account
      </h1>

      {errors.global && (
        <div className="mb-md p-sm bg-danger/10 border border-danger text-danger text-sm rounded-sm font-inter">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="username" className="text-text-muted font-space-grotesk">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!errors.username}
            placeholder="e.g. appi"
            disabled={isLoading}
            autoComplete="username"
          />
          {errors.username && (
            <span className="text-danger text-xs mt-1 font-inter">{errors.username}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="email" className="text-text-muted font-space-grotesk">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!errors.email}
            placeholder="name@example.com"
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && (
            <span className="text-danger text-xs mt-1 font-inter">{errors.email}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="password" className="text-text-muted font-space-grotesk">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!errors.password}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.password && (
            <span className="text-danger text-xs mt-1 font-inter">{errors.password}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="confirmPassword" className="text-text-muted font-space-grotesk">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!errors.confirmPassword}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="text-danger text-xs mt-1 font-inter">{errors.confirmPassword}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent/90 text-white w-full rounded-sm font-space-grotesk font-semibold py-sm mt-xs transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <div className="mt-lg text-left text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
        >
          Sign In
        </Link>
      </div>
    </Card>
  );
}
