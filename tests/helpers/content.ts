import type { PostContent } from "@/domain/content/post";
import type { ProjectContent } from "@/domain/content/project";
import type { AdminSession } from "@/server/auth/require-admin";

import { eq } from "drizzle-orm";

import { db } from "@/server/db/client";
import { createId } from "@/server/db/id";
import { user } from "@/server/db/schema/auth";
import {
  contentEvents,
  mediaUsage,
  posts,
  projects,
} from "@/server/db/schema/content";

export const contentActorId = "k00000000000000000000001";
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
  return {
    user: { id: contentActorId, email: contentActorEmail, role: "admin" },
    session: { id: createId(), userId: contentActorId },
  } as AdminSession;
}

export async function resetContentFixtures() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(user).where(eq(user.email, contentActorEmail));
  await db.insert(user).values({
    id: contentActorId,
    name: "Content Test Admin",
    email: contentActorEmail,
    emailVerified: true,
    role: "admin",
  });
}

export async function removeContentFixtures() {
  await db.delete(contentEvents);
  await db.delete(mediaUsage);
  await db.delete(projects);
  await db.delete(posts);
  await db.delete(user).where(eq(user.email, contentActorEmail));
}
