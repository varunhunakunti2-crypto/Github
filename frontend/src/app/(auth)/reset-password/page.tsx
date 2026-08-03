"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, Button, Input, Label } from "@gitforge/ui";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    global?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasTokenError, setHasTokenError] = useState(false);

  useEffect(() => {
    if (!token) {
      setHasTokenError(true);
    }
  }, [token]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!password) {
      newErrors.password = "New password is required";
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
    if (!token || !validate() || isLoading) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to reset password. The link may have expired.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (hasTokenError) {
    return (
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: reset-password</div>
          <div>State: invalid-request</div>
        </div>
        <h2 className="font-sans text-2xl font-bold mb-sm text-error">
          Invalid Reset Link
        </h2>
        <p className="font-sans text-body text-sm mb-md">
          The password reset link is missing a valid token. Please request a new password reset link.
        </p>
        <Link href="/forgot-password" className="inline-block w-full text-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-sm">
          Request new reset link
        </Link>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: reset-password</div>
          <div>State: completed</div>
        </div>
        <h2 className="font-sans text-2xl font-bold mb-sm text-success">
          Password Updated
        </h2>
        <p className="font-sans text-body text-sm mb-md">
          Your password has been successfully updated. You can now log in using your new credentials.
        </p>
        <Link href="/login" className="inline-block w-full text-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-sm">
          Sign In
        </Link>
      </Card>
    );
  }

  return (
    <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
        <div>Auth-Step: reset-password</div>
        <div>State: pending</div>
      </div>

      <h1 className="font-sans text-3xl font-bold mb-md tracking-tight">
        Choose new password
      </h1>

      {errors.global && (
        <div className="mb-md p-sm bg-error/10 border border-error text-error text-sm rounded-sm font-sans">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="password" className="text-body font-sans">
            New Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-canvas-soft-2 border-hairline text-ink placeholder:text-body/40 focus:border-accent focus:ring-1 focus:ring-primary-focus rounded-sm"
            error={!!errors.password}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.password && (
            <span className="text-error text-xs mt-1 font-sans">{errors.password}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="confirmPassword" className="text-body font-sans">
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-canvas-soft-2 border-hairline text-ink placeholder:text-body/40 focus:border-accent focus:ring-1 focus:ring-primary-focus rounded-sm"
            error={!!errors.confirmPassword}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="text-error text-xs mt-1 font-sans">{errors.confirmPassword}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-white w-full rounded-sm font-sans font-semibold py-sm mt-xs transition-colors focus:ring-2 focus:ring-primary-focus"
        >
          {isLoading ? "Updating password..." : "Reset password"}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: reset-password</div>
          <div>State: loading</div>
        </div>
        <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">Loading...</h1>
      </Card>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
