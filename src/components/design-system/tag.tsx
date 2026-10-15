const TONES = {
  neutral: { color: "var(--text-meta)", borderColor: "var(--line-strong)" },
  interactive: { color: "var(--sage)", borderColor: "rgba(169,196,162,.4)" },
  status: { color: "var(--sand)", borderColor: "rgba(220,196,154,.4)" },
} as const;

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-body)",
        fontSize: "var(--fs-micro)",
        lineHeight: 1.5,
        padding: "3px 8px",
        borderRadius: "var(--r-inline)",
        border: "1px solid",
        whiteSpace: "nowrap",
        ...TONES[tone],
      }}
    >
      {children}
    </span>
  );
}
