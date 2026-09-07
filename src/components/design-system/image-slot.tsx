/* Stand-in for the design tool's <image-slot> authoring element, which only
   works inside the omelette runtime. Renders a bordered placeholder — swap
   for a real <Image> once photography exists for these slots. */
export function ImageSlot({
  placeholder,
  shape = "rounded",
}: {
  slotId: string;
  placeholder?: string;
  shape?: "rect" | "rounded" | "circle" | "pill";
}) {
  const radius =
    shape === "circle"
      ? "50%"
      : shape === "pill"
        ? "var(--r-pill)"
        : shape === "rounded"
          ? "4px"
          : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius,
        border: "1px dashed var(--line-strong)",
        color: "var(--text-meta)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--fs-micro)",
        textAlign: "center",
        padding: "var(--s-3)",
      }}
    >
      {placeholder}
    </div>
  );
}
