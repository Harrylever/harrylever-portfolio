export function SkillGroup({
  label,
  items = [],
}: {
  label: string;
  items?: string[];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
        minWidth: 0,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-display-regular)",
          fontSize: "var(--fs-body)",
          letterSpacing: 0,
          color: "var(--text-status)",
          margin: 0,
        }}
      >
        {label}
      </h3>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--fs-sm)",
          lineHeight: 1.9,
          color: "var(--text-primary)",
          margin: 0,
          maxWidth: "38ch",
        }}
      >
        {items.map((it, i) => (
          <span key={it}>
            {it}
            {i < items.length - 1 ? (
              <span style={{ color: "var(--text-meta)" }}>{",  "}</span>
            ) : null}
          </span>
        ))}
      </p>
    </div>
  );
}
