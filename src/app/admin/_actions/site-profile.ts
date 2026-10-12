"use server";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  runPublishSiteProfile,
  runSaveSiteProfile,
} from "@/server/content/site-profile/admin";

export async function saveSiteProfileAction(input: {
  draft: unknown;
  expectedUpdatedAt: string | null;
}) {
  return runSaveSiteProfile(
    {
      draft: input?.draft,
      expectedUpdatedAt: input?.expectedUpdatedAt ?? null,
    },
    { authorize: () => requireAdmin() },
  );
}

export async function publishSiteProfileAction(input: {
  expectedUpdatedAt: string;
}) {
  return runPublishSiteProfile(
    { expectedUpdatedAt: input?.expectedUpdatedAt },
    { authorize: () => requireAdmin() },
  );
}
