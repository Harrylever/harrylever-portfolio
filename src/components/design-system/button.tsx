"use client";

import * as React from "react";
import Link from "next/link";

import { isInternalHref } from "@/lib/utils";

const SIZES = {
  md: { padding: "11px 22px", fontSize: "var(--fs-meta)" },
  sm: { padding: "8px 16px", fontSize: "var(--fs-micro)" },
} as const;

export function Button({
  children,
  href,
  variant = "outline",
  size = "md",
  magnetic = false,
  disabled = false,
  onClick,
  ariaLabel,
  className,
  target,
}: {
  children: React.ReactNode;
  href?: string;
  variant?: "solid" | "outline" | "quiet";
  size?: keyof typeof SIZES;
  magnetic?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  target?: string;
}) {
  const [hover, setHover] = React.useState(false);
  const [pull, setPull] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLElement | null>(null);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.MouseEvent) => {
    if (!magnetic || reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const max = 6;
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);

    setPull({
      x: Math.max(-1, Math.min(1, dx)) * max,
      y: Math.max(-1, Math.min(1, dy)) * max,
    });
  };

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--s-2)",
    fontFamily: "var(--font-body)",
    fontWeight: "var(--fw-body)",
    lineHeight: 1.2,
    borderRadius: "var(--r-pill)",
    border: "1px solid var(--border-control)",
    background: "transparent",
    color: "var(--text-primary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    textDecoration: "none",
    transition:
      "background var(--dur-base) var(--ease-inout), border-color var(--dur-base) var(--ease-inout), color var(--dur-base) var(--ease-inout), transform var(--dur-slow) var(--ease-settle)",
    ...SIZES[size],
  };

  const variants: Record<string, React.CSSProperties> = {
    solid: {
      background: hover && !disabled ? "var(--sage)" : "var(--haze)",
      borderColor: hover && !disabled ? "var(--sage)" : "var(--haze)",
      color: "var(--on-accent)",
    },
    outline: {
      background: hover && !disabled ? "var(--sage)" : "transparent",
      borderColor: hover && !disabled ? "var(--sage)" : "var(--border-control)",
      color: hover && !disabled ? "var(--on-accent)" : "var(--text-primary)",
    },
    quiet: {
      borderColor: "transparent",
      paddingLeft: 0,
      paddingRight: 0,
      background: "transparent",
      color: hover && !disabled ? "var(--text-primary)" : "var(--text-link)",
    },
  };

  const lift = magnetic
    ? `translate(${pull.x}px, ${pull.y}px)`
    : hover && !disabled && variant !== "quiet"
      ? "translateY(-2px)"
      : "none";

  const style = {
    ...base,
    ...variants[variant],
    transform: reduced ? "none" : lift,
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPull({ x: 0, y: 0 });
    },
    onMouseMove: onMove,
  };

  if (href && !disabled) {
    if (isInternalHref(href)) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          aria-label={ariaLabel}
          className={className}
          href={href}
          style={style}
          {...handlers}
        >
          {children}
        </Link>
      );
    }

    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        aria-label={ariaLabel}
        className={className}
        href={href}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        style={style}
        target={target}
        {...handlers}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      style={style}
      type="button"
      onClick={onClick}
      {...handlers}
    >
      {children}
    </button>
  );
}
