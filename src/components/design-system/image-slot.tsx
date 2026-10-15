/* The frame shown where a project or photo has no image yet. Visitors see
   "Image not available"; the slot id only records which slot it stands for. */
export function ImageSlot({
  shape = "rounded",
}: {
  slotId: string;
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
      Image not available
    </div>
  );
}
