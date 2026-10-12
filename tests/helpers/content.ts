import type { PostContent } from "@/domain/content/post";
import type { ProjectContent } from "@/domain/content/project";
import type { AdminSession } from "@/server/auth/require-admin";

import { ADMIN_USER_ID, buildAdminSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import {
  contentEvents,
  mediaUsage,
  posts,
  projects,
} from "@/server/db/schema/content";

export const contentActorId = ADMIN_USER_ID;
const contentActorEmail = "cms-content-actor@example.invalid";

export function projectContent(name = "Project One"): ProjectContent {
  return {
    name,
    hook: `${name} hook`,
    homepageStory: `${name} homepage story`,
    year: "2026",
    role: "Engineer",
    displayStatus: "Shipped",
    externalUrl: "https://example.com/project",
    stack: ["TypeScript", "PostgreSQL"],
    coverAssetId: null,
    galleryAssetIds: [],
    seo: { title: name, description: `${name} SEO description` },
    caseStudy: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: name }] }],
    },
  };
}

export function postContent(title = "Post One"): PostContent {
  return {
    title,
    summary: `${title} summary`,
    tag: "Engineering",
    coverAssetId: null,
    seo: { title, description: `${title} SEO description` },
    document: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: title }] },
      ],
    },
  };
}

export function adminActor(): AdminSession {
  return buildAdminSession(
    contentActorEmail,
    new Date(Date.now() + 60 * 60 * 1000),
  );
}

export async function resetContentFixtures() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(projects);
  await db.delete(posts);
}

export async function removeContentFixtures() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(projects);
  await db.delete(posts);
}
