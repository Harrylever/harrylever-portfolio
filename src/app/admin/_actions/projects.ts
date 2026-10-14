"use server";

import type { ProjectTransition } from "@/server/content/projects/admin";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  runCreateProject,
  runDeleteProject,
  runDuplicateProject,
  runProjectTransition,
  runReorderProjects,
  runSaveProject,
} from "@/server/content/projects/admin";

/*
 * Every action authorizes itself (via the injected requireAdmin) before it
 * parses its input; the protected layout is not relied on.
 */
const deps = { authorize: () => requireAdmin() };

export async function createProjectAction(input: {
  slug: unknown;
  draft: unknown;
}) {
  return runCreateProject({ slug: input?.slug, draft: input?.draft }, deps);
}

export async function saveProjectAction(input: {
  id: unknown;
  slug: unknown;
  draft: unknown;
  expectedUpdatedAt: unknown;
}) {
  return runSaveProject(
    {
      id: input?.id,
      slug: input?.slug,
      draft: input?.draft,
      expectedUpdatedAt: input?.expectedUpdatedAt,
    },
    deps,
  );
}

export async function transitionProjectAction(
  event: ProjectTransition,
  input: { id: unknown; expectedUpdatedAt: unknown },
) {
  return runProjectTransition(
    event,
    { id: input?.id, expectedUpdatedAt: input?.expectedUpdatedAt },
    deps,
  );
}

export async function deleteProjectAction(input: {
  id: unknown;
  expectedUpdatedAt: unknown;
}) {
  return runDeleteProject(
    { id: input?.id, expectedUpdatedAt: input?.expectedUpdatedAt },
    deps,
  );
}

export async function duplicateProjectAction(input: { id: unknown }) {
  return runDuplicateProject({ id: input?.id }, deps);
}

export async function reorderProjectsAction(input: { orderedIds: unknown }) {
  return runReorderProjects({ orderedIds: input?.orderedIds }, deps);
}
