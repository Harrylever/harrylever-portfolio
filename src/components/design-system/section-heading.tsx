export function SectionHeading({
  children,
  note,
  as: Tag = "h2",
  id,
}: {
  children: React.ReactNode;
  note?: string;
  as?: keyof React.JSX.IntrinsicElements;
  id?: string;
}) {
  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "var(--s-6)",
        marginBottom: "var(--s-9)",
      }}
    >
      <Tag
        id={id}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--fw-display-regular)",
          fontSize: "var(--fs-section)",
          lineHeight: "var(--lh-section)",
          letterSpacing: "var(--tr-section)",
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {children}
      </Tag>
      {note ? (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--fs-meta)",
            color: "var(--text-meta)",
            maxWidth: "34ch",
            margin: 0,
          }}
        >
          {note}
        </p>
      ) : null}
    </header>
  );
}
