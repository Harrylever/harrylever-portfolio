import type { HomeSectionContent } from "@/domain/content/home";

import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { homeSectionTypes } from "@/domain/content/home";
import { ADMIN_SESSION_COOKIE, createSession } from "@/server/auth/session";
import {
  canonicalPreviewPath,
  getPreviewHomepage,
  getPreviewPost,
  getPreviewProject,
  getPreviewSiteProfile,
  handlePreviewDisable,
  handlePreviewEnable,
  parsePreviewTarget,
  previewRobots,
  resolveContentReadMode,
} from "@/server/content/preview";
import { db } from "@/server/db/client";
import { createId } from "@/server/db/id";
import {
  homeSections,
  posts,
  projects,
  siteProfile,
} from "@/server/db/schema/content";

import { adminActor, postContent, projectContent } from "../helpers/content";

const draftCookie = "__prerender_bypass=forged-value";
const publishedAt = new Date("2026-04-02T09:00:00.000Z");

function section(type: (typeof homeSectionTypes)[number], tag: string) {
  const shared = { heading: `${tag} heading`, note: `${tag} note` };

  switch (type) {
    case "intro":
      return {
        type,
        statement: [{ text: tag, emphasis: true }],
        lede: `${tag} lede`,
        portraitAssetId: null,
      } as HomeSectionContent;
    case "now":
      return {
        type,
        ...shared,
        items: [{ label: "Work", body: tag }],
      } as HomeSectionContent;
    case "built":
      return { type, ...shared, ctaLabel: "Read" } as HomeSectionContent;
    case "commits":
      return { type, ...shared, githubUsername: "owner" } as HomeSectionContent;
    case "frames":
      return {
        type,
        ...shared,
        items: [
          { placeholderSlot: "slot", aspectRatio: "4 / 5", caption: tag },
        ],
      } as HomeSectionContent;
    case "reach":
      return {
        type,
        ...shared,
        groups: [{ label: "Daily", items: ["TypeScript"] }],
        experienceIntro: tag,
        experiences: [],
      } as HomeSectionContent;
    case "loop":
      return {
        type,
        ...shared,
        intro: tag,
        items: [{ tool: "Claude", use: "Pairing", frequency: "Every day" }],
        footer: tag,
      } as HomeSectionContent;
    case "say":
      return {
        type,
        heading: tag,
        email: "owner@example.com",
      } as HomeSectionContent;
  }
}

async function adminHeaders(): Promise<Headers> {
  const { token } = await createSession();

  return new Headers({
    cookie: `${ADMIN_SESSION_COOKIE}=${token}; ${draftCookie}`,
  });
}

async function clean() {
  await db.delete(homeSections);
  await db.delete(siteProfile);
  await db.delete(projects);
  await db.delete(posts);
}

function fakeController() {
  const calls: string[] = [];

  return {
    calls,
    enable: () => void calls.push("enable"),
    disable: () => void calls.push("disable"),
  };
}

describe.serial("authenticated draft preview", () => {
  beforeEach(async () => {
    await clean();
    await db.insert(siteProfile).values({
      draftContent: {
        name: "Draft Owner",
        location: "Abuja",
        tagline: "t",
        description: "d",
        email: "o@example.com",
        githubUsername: "owner",
        socialLinks: [],
      },
    });
    await db.insert(homeSections).values(
      homeSectionTypes.map((type, position) => ({
        type,
        draftContent: section(type, "Draft"),
        publishedContent: section(type, "Published"),
        draftVisible: true,
        publishedVisible: true,
        draftPosition: position,
        publishedPosition: position,
        publishedAt,
      })),
    );
    await db.insert(projects).values([
      {
        id: createId(),
        slug: "live-project",
        draftContent: projectContent("Draft Project Name"),
        publishedContent: projectContent("Published Project Name"),
        status: "published",
        publishedAt,
      },
      {
        id: createId(),
        slug: "never-published",
        draftContent: projectContent("Never Published"),
        status: "draft",
      },
      {
        id: createId(),
        slug: "trashed-project",
        draftContent: projectContent("Trashed"),
        status: "draft",
        deletedAt: publishedAt,
      },
    ]);
    await db.insert(posts).values([
      {
        id: createId(),
        slug: "draft-post",
        draftContent: postContent("Unpublished Draft Post"),
        status: "draft",
      },
      {
        id: createId(),
        slug: "trashed-post",
        draftContent: postContent("Trashed Post"),
        status: "draft",
        deletedAt: publishedAt,
      },
    ]);
  }, 60_000);
  afterAll(clean, 60_000);

  test("never trusts draft mode without a current admin session", async () => {
    const forged = new Headers({ cookie: draftCookie });

    await expect(resolveContentReadMode(forged)).rejects.toMatchObject({
      status: 401,
    });
    await expect(resolveContentReadMode(new Headers())).resolves.toBe(
      "published",
    );
    await expect(resolveContentReadMode(await adminHeaders())).resolves.toBe(
      "draft",
    );
  }, 60_000);

  test("rejects anonymous enable and disable calls", async () => {
    const controller = fakeController();
    const enable = await handlePreviewEnable(
      new Request("http://localhost:3000/api/admin/preview?type=home", {
        headers: { cookie: draftCookie },
      }),
      controller,
    );
    const disable = await handlePreviewDisable(
      new Request("http://localhost:3000/api/admin/preview/disable"),
      controller,
    );

    expect(enable.status).toBe(401);
    expect(disable.status).toBe(401);
    expect(controller.calls).toEqual([]);
  });

  test("enables preview for admins and redirects to canonical routes", async () => {
    const headers = await adminHeaders();
    const controller = fakeController();
    const response = await handlePreviewEnable(
      new Request(
        "http://localhost:3000/api/admin/preview?type=post&slug=draft-post",
        { headers },
      ),
      controller,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/blog/draft-post");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(controller.calls).toEqual(["enable"]);

    const bad = await handlePreviewEnable(
      new Request(
        "http://localhost:3000/api/admin/preview?type=post&slug=../admin",
        { headers },
      ),
      controller,
    );

    expect(bad.status).toBe(400);
    expect(controller.calls).toEqual(["enable"]);

    const disabled = await handlePreviewDisable(
      new Request("http://localhost:3000/api/admin/preview/disable", {
        headers,
      }),
      controller,
    );

    expect(disabled.status).toBe(307);
    expect(controller.calls).toEqual(["enable", "disable"]);
  }, 60_000);

  test("validates preview targets", () => {
    const parse = (query: string) =>
      parsePreviewTarget(new URLSearchParams(query));

    expect(parse("type=home")).toEqual({ type: "home" });
    expect(canonicalPreviewPath({ type: "project", slug: "a-b" })).toBe(
      "/projects/a-b",
    );
    expect(parse("type=project")).toBeNull();
    expect(parse("type=other&slug=a")).toBeNull();
    expect(parse("type=post&slug=Bad_Slug")).toBeNull();
    expect(previewRobots).toEqual({ index: false, follow: false });
  });

  test("renders draft snapshots, including never-published content", async () => {
    const admin = adminActor();

    expect((await getPreviewProject("live-project", admin))?.name).toBe(
      "Draft Project Name",
    );
    expect((await getPreviewProject("never-published", admin))?.name).toBe(
      "Never Published",
    );
    expect((await getPreviewPost("draft-post", admin))?.title).toBe(
      "Unpublished Draft Post",
    );
    expect((await getPreviewSiteProfile(admin))?.name).toBe("Draft Owner");
    expect((await getPreviewHomepage(admin))?.intro.lede).toBe("Draft lede");
  });

  test("keeps trashed drafts out of preview", async () => {
    const admin = adminActor();

    expect(await getPreviewPost("trashed-post", admin)).toBeNull();
    expect(await getPreviewProject("trashed-project", admin)).toBeNull();
  });

  test("draft repositories independently require an admin", async () => {
    const notAdmin = {
      ...adminActor(),
      user: { ...adminActor().user, role: "user" },
    } as unknown as ReturnType<typeof adminActor>;

    await expect(getPreviewPost("draft-post", notAdmin)).rejects.toMatchObject({
      status: 403,
    });
    await expect(getPreviewHomepage(undefined as never)).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      getPreviewProject("live-project", undefined as never),
    ).rejects.toMatchObject({ status: 401 });
  });
});
