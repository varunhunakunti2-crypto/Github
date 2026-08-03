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
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: forgot-password</div>
          <div>State: email-sent</div>
        </div>
        <h2 className="font-sans text-2xl font-bold mb-sm text-success">
          Check your email
        </h2>
        <p className="font-sans text-body text-sm mb-md">
          If an account exists for <span className="font-mono text-ink">{email}</span>, we have sent password reset instructions to it.
        </p>
        <Link href="/login" className="inline-block w-full text-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-sm">
          Return to Sign In
        </Link>
      </Card>
    );
  }

  return (
    <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
        <div>Auth-Step: forgot-password</div>
        <div>State: email-pending</div>
      </div>

      <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">
        Reset your password
      </h1>
      <p className="font-sans text-body text-sm mb-md">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="email" className="text-body font-sans">
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
            className="bg-canvas-soft-2 border-hairline text-ink placeholder:text-body/40 focus:border-accent focus:ring-1 focus:ring-primary-focus rounded-sm"
            error={!!error}
            placeholder="name@example.com"
            disabled={isLoading}
            autoComplete="email"
          />
          {error && (
            <span className="text-error text-xs mt-1 font-sans">{error}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-white w-full rounded-sm font-sans font-semibold py-sm mt-xs transition-colors focus:ring-2 focus:ring-primary-focus focus:ring-offset-2 focus:ring-offset-base"
        >
          {isLoading ? "Sending link..." : "Send reset link"}
        </Button>
      </form>

      <div className="mt-lg text-left text-sm text-body">
        <Link
          href="/login"
          className="text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-sm"
        >
          Back to Sign In
        </Link>
      </div>
    </Card>
  );
}
