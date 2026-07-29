import React from "react";
import type { Metadata } from "next";
import "@gitforge/ui/src/theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitForge - High-Performance Git Platform",
  description: "Fast, stark repository hosting and developer collaboration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-canvas-soft text-ink min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
