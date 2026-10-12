import { ImageSlot } from "./image-slot";

/* Photograph frame: 4px radius, a hairline, an optional caption, and a slight
   desaturation so a warm phone photo sits in the room without fighting the
   sage/sand accents. */
export function Figure({
  slotId,
  asset,
  caption,
  aspect = "4 / 5",
  placeholder = "Drop an image",
  shape = "rounded",
  tone = "room",
  style,
}: {
  slotId: string;
  asset?: {
    secureUrl: string;
    altText: string;
    width: number;
    height: number;
  } | null;
  caption?: string;
  aspect?: string;
  placeholder?: string;
  shape?: "rect" | "rounded" | "circle" | "pill";
  tone?: "room" | "sunken";
  style?: React.CSSProperties;
}) {
  return (
    <figure
      style={{
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-3)",
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: aspect,
          width: "100%",
          borderRadius: "var(--r-card)",
          overflow: "hidden",
          background:
            tone === "sunken" ? "var(--bg-sunken)" : "var(--bg-surface)",
          boxShadow: "inset 0 0 0 1px var(--line)",
          filter: "saturate(.88) contrast(1.02)",
        }}
      >
        {asset ? (
          // Cloudinary provides the already-transformed public URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={asset.altText}
            height={asset.height}
            src={asset.secureUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            width={asset.width}
          />
        ) : (
          <ImageSlot placeholder={placeholder} shape={shape} slotId={slotId} />
        )}
      </div>
      {caption ? (
        <figcaption
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--fs-micro)",
            lineHeight: 1.5,
            color: "var(--text-meta)",
            maxWidth: "40ch",
          }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
