import React from 'react';

export function Button({
  variant = 'primary',
  children,
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'primary-sm' | 'secondary-sm';
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseStyle = "font-sans font-medium transition-colors select-none flex items-center justify-center";
  
  const variants = {
    primary: "bg-primary text-on-primary rounded-pill px-6 h-[48px] text-[16px] hover:bg-neutral-800",
    secondary: "bg-canvas text-ink border border-hairline rounded-pill px-6 h-[48px] text-[16px] hover:bg-canvas-soft",
    'primary-sm': "bg-primary text-on-primary rounded-pill px-4 h-[32px] text-[14px] hover:bg-neutral-800",
    'secondary-sm': "bg-canvas text-ink border border-hairline rounded-pill px-4 h-[32px] text-[14px] hover:bg-canvas-soft",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

export function Card({
  elevation = 3,
  children,
  className = '',
  ...props
}: {
  elevation?: 1 | 2 | 3 | 4 | 5;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const shadows = {
    1: "shadow-level-1",
    2: "shadow-level-2",
    3: "shadow-level-3",
    4: "shadow-level-4",
    5: "shadow-level-5",
  };

  return (
    <div
      className={`bg-canvas text-ink rounded-md p-6 ${shadows[elevation]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
