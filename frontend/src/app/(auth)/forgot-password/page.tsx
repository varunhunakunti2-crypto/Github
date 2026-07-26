"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Button, Input, Label } from "@gitforge/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    if (!email) {
      setError("Email address is required");
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      // Always show success state to prevent user enumeration
      setIsSubmitted(true);
    } catch (err: any) {
      // Even on net error, show the confirmation screen (or custom info)
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-text-muted border border-border bg-base p-xs rounded-sm">
          <div>Auth-Step: forgot-password</div>
          <div>State: email-sent</div>
        </div>
        <h2 className="font-space-grotesk text-2xl font-bold mb-sm text-success">
          Check your email
        </h2>
        <p className="font-inter text-text-muted text-sm mb-md">
          If an account exists for <span className="font-mono text-text-primary">{email}</span>, we have sent password reset instructions to it.
        </p>
        <Link href="/login" className="inline-block w-full text-center text-sm font-medium text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm">
          Return to Sign In
        </Link>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-text-muted border border-border bg-base p-xs rounded-sm">
        <div>Auth-Step: forgot-password</div>
        <div>State: email-pending</div>
      </div>

      <h1 className="font-space-grotesk text-3xl font-bold mb-sm tracking-tight">
        Reset your password
      </h1>
      <p className="font-inter text-text-muted text-sm mb-md">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="email" className="text-text-muted font-space-grotesk">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
            error={!!error}
            placeholder="name@example.com"
            disabled={isLoading}
            autoComplete="email"
          />
          {error && (
            <span className="text-danger text-xs mt-1 font-inter">{error}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="bg-accent hover:bg-accent/90 text-white w-full rounded-sm font-space-grotesk font-semibold py-sm mt-xs transition-colors focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-base"
        >
          {isLoading ? "Sending link..." : "Send reset link"}
        </Button>
      </form>

      <div className="mt-lg text-left text-sm text-text-muted">
        <Link
          href="/login"
          className="text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded-sm"
        >
          Back to Sign In
        </Link>
      </div>
    </Card>
  );
}
