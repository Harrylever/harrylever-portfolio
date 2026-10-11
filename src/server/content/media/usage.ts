import type { DbTransaction } from "@/server/db/client";
import type { ContentOwner } from "@/server/content/events";

import { and, eq } from "drizzle-orm";

import { mediaUsage } from "@/server/db/schema/content";

export type MediaReference = { assetId: string; field: string };
export type MediaUsageOwner = ContentOwner & {
  snapshot: "draft" | "published";
};

export function collectMediaReferences(content: unknown): MediaReference[] {
  const references: MediaReference[] = [];

  function visit(value: unknown, path: string) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));

      return;
    }

    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      const field = path ? `${path}.${key}` : key;

      if (key.endsWith("AssetId") && typeof child === "string") {
        references.push({ assetId: child, field });
      } else if (key.endsWith("AssetIds") && Array.isArray(child)) {
        child.forEach((assetId, index) => {
          if (typeof assetId === "string") {
            references.push({ assetId, field: `${field}[${index}]` });
          }
        });
      } else {
        visit(child, field);
      }
    }
  }

  visit(content, "");

  return references;
}

export async function refreshMediaUsage(
  transaction: DbTransaction,
  owner: MediaUsageOwner,
  references: MediaReference[],
) {
  await transaction
    .delete(mediaUsage)
    .where(
      and(
        eq(mediaUsage.contentType, owner.type),
        eq(mediaUsage.contentId, owner.id),
        eq(mediaUsage.snapshot, owner.snapshot),
      ),
    );

  const unique = Array.from(
    new Map(
      references.map((reference) => [
        `${reference.assetId}:${reference.field}`,
        reference,
      ]),
    ).values(),
  );

  if (unique.length > 0) {
    await transaction.insert(mediaUsage).values(
      unique.map((reference) => ({
        mediaAssetId: reference.assetId,
        contentType: owner.type,
        contentId: owner.id,
        snapshot: owner.snapshot,
        field: reference.field,
      })),
    );
  }
}
