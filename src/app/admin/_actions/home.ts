"use server";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  runPublishHomepage,
  runReorderHome,
  runSaveHomeSection,
  runSetHomeSectionVisibility,
} from "@/server/content/home/admin";

/*
 * Every action authorizes itself (via the injected requireAdmin) before it
 * parses its input; the protected layout is not relied on.
 */
const deps = { authorize: () => requireAdmin() };

export async function saveHomeSectionAction(input: {
  type: unknown;
  draft: unknown;
  visible: unknown;
  expectedUpdatedAt: unknown;
}) {
  return runSaveHomeSection(
    {
      type: input?.type,
      draft: input?.draft,
      visible: input?.visible,
      expectedUpdatedAt: input?.expectedUpdatedAt,
    },
    deps,
  );
}

export async function setHomeSectionVisibilityAction(input: {
  type: unknown;
  visible: unknown;
  expectedUpdatedAt: unknown;
}) {
  return runSetHomeSectionVisibility(
    {
      type: input?.type,
      visible: input?.visible,
      expectedUpdatedAt: input?.expectedUpdatedAt,
    },
    deps,
  );
}

export async function reorderHomeAction(input: { order: unknown }) {
  return runReorderHome({ order: input?.order }, deps);
}

export async function publishHomepageAction(input: { expected: unknown }) {
  return runPublishHomepage({ expected: input?.expected }, deps);
}
