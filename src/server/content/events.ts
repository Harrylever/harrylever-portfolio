import type { AdminSession } from "@/server/auth/require-admin";
import type { DbTransaction } from "@/server/db/client";

import { contentEvents } from "@/server/db/schema/content";

export type ContentOwner = {
  type: "site_profile" | "home_section" | "project" | "post";
  id: string;
};

export async function recordContentEvent(
  transaction: DbTransaction,
  actor: AdminSession,
  owner: ContentOwner,
  eventType:
    | "create"
    | "update"
    | "publish"
    | "unpublish"
    | "trash"
    | "restore"
    | "permanent_delete",
  metadata: Record<string, unknown> = {},
) {
  await transaction.insert(contentEvents).values({
    actorId: actor.user.id,
    contentType: owner.type,
    contentId: owner.id,
    eventType,
    metadata,
  });
}
