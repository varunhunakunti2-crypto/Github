import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base text-text-primary font-inter flex flex-col items-center justify-center p-sm md:p-md selection:bg-accent selection:text-white">
      <div className="w-full max-w-[420px]">
        {children}
      </div>
    </div>
  );
}
