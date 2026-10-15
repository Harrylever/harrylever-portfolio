"use server";

import type { PostTransition } from "@/server/content/posts/admin";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  runCreatePost,
  runDeletePost,
  runDuplicatePost,
  runPostTransition,
  runSavePost,
} from "@/server/content/posts/admin";

/*
 * Every action authorizes itself (via the injected requireAdmin) before it
 * parses its input; the protected layout is not relied on.
 */
const deps = { authorize: () => requireAdmin() };

export async function createPostAction(input: {
  slug: unknown;
  draft: unknown;
}) {
  return runCreatePost({ slug: input?.slug, draft: input?.draft }, deps);
}

export async function savePostAction(input: {
  id: unknown;
  slug: unknown;
  draft: unknown;
  expectedUpdatedAt: unknown;
}) {
  return runSavePost(
    {
      id: input?.id,
      slug: input?.slug,
      draft: input?.draft,
      expectedUpdatedAt: input?.expectedUpdatedAt,
    },
    deps,
  );
}

export async function transitionPostAction(
  event: PostTransition,
  input: { id: unknown; expectedUpdatedAt: unknown },
) {
  return runPostTransition(
    event,
    { id: input?.id, expectedUpdatedAt: input?.expectedUpdatedAt },
    deps,
  );
}

export async function deletePostAction(input: {
  id: unknown;
  expectedUpdatedAt: unknown;
}) {
  return runDeletePost(
    { id: input?.id, expectedUpdatedAt: input?.expectedUpdatedAt },
    deps,
  );
}

export async function duplicatePostAction(input: { id: unknown }) {
  return runDuplicatePost({ id: input?.id }, deps);
}
