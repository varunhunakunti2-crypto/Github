import React, { useState, useRef, useEffect, Fragment } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Check,
  Info,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";

// Class merger utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUTTONS & CTAS
// ─────────────────────────────────────────────────────────────────────────────

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "primary-sm"
    | "secondary-sm"
    | "nav-signup"
    | "nav-login"
    | "nav-ask-ai"
    | "tab-ghost";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => {
    const baseStyle =
      "font-sans font-medium transition-all duration-200 select-none flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-link disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-primary text-on-primary rounded-pill px-sm h-[48px] font-button-lg hover:bg-ink/90 dark:hover:bg-on-primary/90",
      secondary:
        "bg-canvas text-ink border border-hairline rounded-pill px-sm h-[48px] font-button-lg hover:bg-canvas-soft shadow-level-2 hover:border-hairline-strong",
      "primary-sm":
        "bg-primary text-on-primary rounded-pill px-xs h-[32px] font-button-md hover:bg-ink/90 dark:hover:bg-on-primary/90",
      "secondary-sm":
        "bg-canvas text-ink border border-hairline rounded-pill px-xs h-[32px] font-button-md hover:bg-canvas-soft shadow-level-1 hover:border-hairline-strong",
      "nav-signup":
        "bg-primary text-on-primary rounded-sm px-xs h-[28px] font-body-sm-strong hover:bg-ink/90 dark:hover:bg-on-primary/90",
      "nav-login":
        "bg-canvas text-ink rounded-sm px-xs h-[28px] font-body-sm-strong hover:bg-canvas-soft",
      "nav-ask-ai":
        "bg-canvas text-ink border border-hairline rounded-sm px-xs h-[28px] font-body-sm-strong hover:bg-canvas-soft hover:border-hairline-strong shadow-level-1",
      "tab-ghost":
        "bg-transparent hover:bg-canvas-soft-2 text-body hover:text-ink rounded-pill-sm px-md h-[36px] font-body-sm active:bg-canvas-soft-2",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyle, variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

// Circular icon button
export interface IconButtonCircularProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const IconButtonCircular = React.forwardRef<
  HTMLButtonElement,
  IconButtonCircularProps
>(
  (
    {
      className,
      children,
      "aria-label": ariaLabel = "Action Button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          "w-10 h-10 flex items-center justify-center bg-canvas text-ink border border-hairline rounded-full hover:bg-canvas-soft hover:border-hairline-strong hover:shadow-level-2 transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-link",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButtonCircular.displayName = "IconButtonCircular";

// ─────────────────────────────────────────────────────────────────────────────
// 2. CARDS & CONTAINERS
// ─────────────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2 | 3 | 4 | 5;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 3, className, children, ...props }, ref) => {
    const shadows = {
      1: "shadow-level-1",
      2: "shadow-level-2",
      3: "shadow-level-3",
      4: "shadow-level-4",
      5: "shadow-level-5",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-canvas text-ink border border-hairline rounded-md p-lg transition-shadow duration-200",
          shadows[elevation],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

// Card variants matching design spec
export const CardMarketing = ({ className, children, ...props }: CardProps) => (
  <Card
    elevation={3}
    className={cn("rounded-md p-lg border-hairline bg-canvas", className)}
    {...props}
  >
    {children}
  </Card>
);

export const CardMarketingLarge = ({
  className,
  children,
  ...props
}: CardProps) => (
  <Card
    elevation={4}
    className={cn("rounded-lg p-xl border-hairline bg-canvas", className)}
    {...props}
  >
    {children}
  </Card>
);

export const CardSoft = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-canvas-soft text-ink rounded-md p-lg border border-hairline/10",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const TemplateCard = ({
  thumbnailSrc,
  title,
  framework,
  className,
  ...props
}: {
  thumbnailSrc?: string;
  title: string;
  framework: string;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-canvas text-ink border border-hairline rounded-md p-md shadow-level-2 hover:shadow-level-3 hover:border-hairline-strong transition-all duration-200 cursor-pointer group flex flex-col gap-3",
      className,
    )}
    {...props}
  >
    <div className="aspect-video w-full rounded-md bg-canvas-soft-2 overflow-hidden relative border border-hairline">
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-mute font-mono text-[12px] bg-gradient-to-br from-canvas-soft to-canvas-soft-2">
          16:9 Thumbnail
        </div>
      )}
    </div>
    <div className="flex flex-col gap-1">
      <span className="font-caption-mono text-mute uppercase tracking-wider">
        {framework}
      </span>
      <h4 className="font-sans font-semibold text-[16px] text-ink">{title}</h4>
    </div>
  </div>
);

export const CodeEditorMockup = ({
  code,
  filename,
  className,
  ...props
}: {
  code: string;
  filename?: string;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-primary text-on-primary rounded-md p-lg font-code border border-white/5 shadow-level-4 flex flex-col gap-4 overflow-x-auto",
      className,
    )}
    {...props}
  >
    {filename && (
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-1">
        <span className="font-mono text-[12px] text-white/50">{filename}</span>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        </div>
      </div>
    )}
    <pre className="text-[13px] leading-[20px] text-white/90">
      <code>{code}</code>
    </pre>
  </div>
);

export const PricingCard = ({
  tierName,
  price,
  frequency = "month",
  description,
  features,
  cta,
  className,
  ...props
}: {
  tierName: string;
  price: string;
  frequency?: string;
  description: string;
  features: string[];
  cta: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <Card
    elevation={4}
    className={cn(
      "bg-canvas text-ink border-hairline rounded-lg p-xl flex flex-col gap-6",
      className,
    )}
    {...props}
  >
    <div className="flex flex-col gap-2">
      <h3 className="font-sans font-semibold text-2xl tracking-tight text-ink">
        {tierName}
      </h3>
      <p className="font-sans text-[14px] text-body">{description}</p>
    </div>
    <div className="flex items-baseline gap-1 py-2">
      <span className="font-sans font-semibold text-4xl tracking-tighter text-ink">
        {price}
      </span>
      <span className="font-sans text-[14px] text-mute">/{frequency}</span>
    </div>
    <div className="w-full">{cta}</div>
    <div className="border-t border-hairline pt-6 mt-2 flex-1 flex flex-col gap-3">
      <span className="font-caption-mono text-mute uppercase tracking-wider">
        What's Included
      </span>
      <ul className="flex flex-col gap-2.5">
        {features.map((feature, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-[14px] text-body font-sans"
          >
            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </Card>
);

export const PricingCardFeatured = ({
  tierName,
  price,
  frequency = "month",
  description,
  features,
  cta,
  className,
  ...props
}: {
  tierName: string;
  price: string;
  frequency?: string;
  description: string;
  features: string[];
  cta: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-primary text-on-primary rounded-lg p-xl shadow-level-5 border border-white/10 flex flex-col gap-6 relative overflow-hidden",
      className,
    )}
    {...props}
  >
    <div className="absolute top-0 right-0 bg-link text-on-primary font-caption-mono uppercase tracking-wider text-[10px] px-3 py-1 rounded-bl-sm">
      Popular
    </div>
    <div className="flex flex-col gap-2">
      <h3 className="font-sans font-semibold text-2xl tracking-tight text-on-primary">
        {tierName}
      </h3>
      <p className="font-sans text-[14px] text-on-primary/70">{description}</p>
    </div>
    <div className="flex items-baseline gap-1 py-2">
      <span className="font-sans font-semibold text-4xl tracking-tighter text-on-primary">
        {price}
      </span>
      <span className="font-sans text-[14px] text-on-primary/50">
        /{frequency}
      </span>
    </div>
    <div className="w-full">{cta}</div>
    <div className="border-t border-white/10 pt-6 mt-2 flex-1 flex flex-col gap-3">
      <span className="font-caption-mono text-on-primary/50 uppercase tracking-wider">
        What's Included
      </span>
      <ul className="flex flex-col gap-2.5">
        {features.map((feature, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-[14px] text-on-primary/95 font-sans"
          >
            <Check className="w-4 h-4 text-on-primary shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. INPUTS & FORMS
// ─────────────────────────────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sizeVariant?: "sm" | "md" | "lg";
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ sizeVariant = "md", error, className, ...props }, ref) => {
    const baseStyle =
      "w-full bg-canvas text-ink border rounded-sm transition-colors duration-200 outline-none placeholder:text-mute focus:border-ink dark:focus:border-on-primary disabled:opacity-50 disabled:bg-canvas-soft font-sans";

    const sizes = {
      sm: "h-[32px] px-sm font-body-sm",
      md: "h-[40px] px-sm font-body-sm",
      lg: "h-[48px] px-sm font-body-md",
    };

    return (
      <input
        ref={ref}
        className={cn(
          baseStyle,
          sizes[sizeVariant],
          error
            ? "border-error focus:border-error-deep focus:ring-1 focus:ring-error"
            : "border-hairline",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full min-h-[100px] p-sm bg-canvas text-ink border rounded-sm transition-colors duration-200 outline-none placeholder:text-mute focus:border-ink dark:focus:border-on-primary disabled:opacity-50 disabled:bg-canvas-soft font-sans font-body-sm",
          error
            ? "border-error focus:border-error-deep focus:ring-1 focus:ring-error"
            : "border-hairline",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "w-full h-[40px] pl-sm pr-lg bg-canvas text-ink border border-hairline rounded-sm transition-colors duration-200 outline-none focus:border-ink dark:focus:border-on-primary disabled:opacity-50 disabled:bg-canvas-soft font-sans font-body-sm appearance-none",
            error && "border-error focus:border-error",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-mute">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  },
);
Select.displayName = "Select";

export const Label = ({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn("font-body-sm-strong text-body select-none", className)}
    {...props}
  >
    {children}
  </label>
);

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "w-4 h-4 rounded-xs border border-hairline text-primary focus:ring-link focus:ring-2 focus:ring-offset-1 focus:ring-offset-canvas checked:bg-primary accent-primary bg-canvas cursor-pointer transition-all duration-200 outline-none",
        className,
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

// ─────────────────────────────────────────────────────────────────────────────
// 4. NAVIGATION & LAYOUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  links?: Array<{ href: string; label: string; active?: boolean }>;
  actions?: React.ReactNode;
}

export const NavLink = ({
  active,
  href,
  children,
  className,
  ...props
}: {
  active?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    href={href}
    className={cn(
      "font-sans font-body-sm px-sm py-xs rounded-full transition-colors",
      active
        ? "text-ink bg-canvas-soft-2 font-medium"
        : "text-body hover:text-ink hover:bg-canvas-soft/80",
      className,
    )}
    {...props}
  >
    {children}
  </a>
);

export const NavBar = ({
  logo,
  links = [],
  actions,
  className,
  ...props
}: NavBarProps) => (
  <header
    className={cn(
      "sticky top-0 z-50 w-full h-[64px] border-b border-hairline bg-canvas/80 backdrop-blur-md py-sm px-lg flex items-center justify-between transition-colors",
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-6">
      {logo}
      <nav className="hidden md:flex items-center gap-2">
        {links.map((link, idx) => (
          <NavLink key={idx} href={link.href} active={link.active}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </header>
);

export const Footer = ({
  logo,
  columns = [],
  copyright,
  className,
  ...props
}: {
  logo?: React.ReactNode;
  columns?: Array<{
    title: string;
    links: Array<{ href: string; label: string }>;
  }>;
  copyright?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) => (
  <footer
    className={cn(
      "border-t border-hairline py-4xl px-lg bg-canvas-soft text-body transition-colors",
      className,
    )}
    {...props}
  >
    <div className="max-w-[1400px] mx-auto flex flex-col gap-12">
      {columns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {columns.map((col, idx) => (
            <div key={idx} className="flex flex-col gap-4">
              <span className="font-caption-mono text-mute uppercase tracking-wider text-[11px] font-semibold">
                {col.title}
              </span>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <a
                      href={link.href}
                      className="font-sans font-body-sm text-body hover:text-ink transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-hairline/60 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          {logo}
          {copyright && (
            <span className="font-sans text-[12px] text-mute">{copyright}</span>
          )}
        </div>
      </div>
    </div>
  </footer>
);

export const Sidebar = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <aside
    className={cn(
      "w-64 border-r border-hairline bg-canvas flex flex-col gap-4 p-md min-h-screen transition-colors",
      className,
    )}
    {...props}
  >
    {children}
  </aside>
);

export const SidebarRow = ({
  active,
  children,
  className,
  ...props
}: {
  active?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative font-sans font-body-sm rounded-sm px-sm py-xs cursor-pointer transition-colors select-none flex items-center gap-3 group",
      active
        ? "bg-canvas-soft text-ink font-medium"
        : "text-body hover:bg-canvas-soft-2 hover:text-ink",
      className,
    )}
    {...props}
  >
    {active && (
      <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-primary rounded-r-full" />
    )}
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTERACTIVE OVERLAYS (Modals, Dropdowns, Toasts)
// ─────────────────────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footerActions,
}: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/20 dark:bg-canvas/10 backdrop-blur-[4px] transition-opacity duration-300"
        onClick={onClose}
      />
      {/* Modal Surface */}
      <div className="bg-canvas border border-hairline rounded-lg shadow-level-5 w-full max-w-[520px] p-xl flex flex-col gap-6 relative z-10 transition-all duration-300 transform scale-100 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-mute hover:text-ink hover:bg-canvas-soft transition-colors outline-none focus-visible:ring-2 focus-visible:ring-link"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1.5 pr-6">
          <h3 className="font-sans font-semibold text-[20px] leading-[28px] text-ink">
            {title}
          </h3>
          {description && (
            <p className="font-sans font-body-sm text-body">{description}</p>
          )}
        </div>

        <div className="font-sans font-body-md text-body leading-relaxed">
          {children}
        </div>

        {footerActions && (
          <div className="flex items-center justify-end gap-3 border-t border-hairline pt-6 mt-2">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}

export const Dropdown = ({
  trigger,
  children,
  align = "right",
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-56 bg-canvas border border-hairline rounded-sm shadow-level-5 p-xxs animate-in fade-in slide-in-from-top-2 duration-150 outline-none",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div
            className="py-1 flex flex-col gap-0.5"
            role="menu"
            aria-orientation="vertical"
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  children,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    role="menuitem"
    onClick={(e) => {
      if (onClick) onClick(e);
    }}
    className={cn(
      "w-full text-left font-sans font-body-sm px-3 py-2 rounded-xs text-body hover:text-ink hover:bg-canvas-soft-2 transition-colors outline-none focus-visible:bg-canvas-soft-2 focus-visible:text-ink cursor-pointer",
      className,
    )}
    {...props}
  >
    {children}
  </button>
);

export interface ToastProps {
  message: string;
  description?: string;
  type?: "success" | "info" | "warning" | "error";
  onClose?: () => void;
}

export const Toast = ({
  message,
  description,
  type = "info",
  onClose,
}: ToastProps) => {
  const icons = {
    success: <Check className="w-4 h-4 text-success shrink-0" />,
    info: <Info className="w-4 h-4 text-link shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-error shrink-0" />,
  };

  const borders = {
    success: "border-success/30 bg-canvas",
    info: "border-link/30 bg-canvas",
    warning: "border-warning/30 bg-canvas",
    error: "border-error/30 bg-canvas",
  };

  return (
    <div
      className={cn(
        "bg-canvas text-ink border border-hairline rounded-md py-sm px-md shadow-level-4 flex items-start gap-3 w-[360px] animate-in fade-in slide-in-from-bottom-5 duration-300",
        borders[type],
      )}
    >
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1 flex flex-col gap-0.5">
        <h5 className="font-sans font-semibold text-[14px] text-ink">
          {message}
        </h5>
        {description && (
          <p className="font-sans text-[12px] text-body">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-full text-mute hover:text-ink hover:bg-canvas-soft transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. DATA TABLES
// ─────────────────────────────────────────────────────────────────────────────

export const Table = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto border border-hairline rounded-md shadow-level-2 bg-canvas">
    <table
      className={cn("w-full border-collapse text-left", className)}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const TableHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn("bg-canvas-soft border-b border-hairline", className)}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody
    className={cn("divide-y divide-hairline bg-canvas", className)}
    {...props}
  >
    {children}
  </tbody>
);

export const TableRow = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn("hover:bg-canvas-soft/40 transition-colors", className)}
    {...props}
  >
    {children}
  </tr>
);

export const TableHeaderCell = ({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "px-sm py-xs font-caption-mono text-mute uppercase tracking-wider text-[11px] font-semibold select-none",
      className,
    )}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn("px-sm py-xs font-sans font-body-sm text-body", className)}
    {...props}
  >
    {children}
  </td>
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. BADGES & OTHER ELEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const Badge = ({
  variant = "secondary",
  className,
  children,
  ...props
}: {
  variant?: "secondary" | "success" | "error" | "warning" | "violet";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) => {
  const styles = {
    secondary: "bg-canvas-soft text-body border-hairline",
    success: "bg-link-bg-soft text-link border-link/20",
    error: "bg-error-soft text-error-deep border-error/20",
    warning: "bg-warning-soft text-warning-deep border-warning/20",
    violet: "bg-violet-soft text-violet-deep border-violet/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-sans font-caption py-xxs px-xs rounded-full border text-[11px] font-medium transition-colors",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export const Banner = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "inline-flex items-center gap-2 bg-canvas border border-hairline/80 shadow-level-2 px-sm py-xs rounded-full font-sans font-body-sm text-body hover:border-hairline-strong transition-all duration-200 cursor-pointer select-none",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const LinkInline = ({
  className,
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    href={href}
    className={cn(
      "font-sans font-body-md text-link hover:text-link-deep underline underline-offset-4 decoration-link/30 hover:decoration-link-deep transition-all duration-200",
      className,
    )}
    {...props}
  >
    {children}
  </a>
);
