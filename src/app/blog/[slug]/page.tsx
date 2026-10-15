import { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/server/auth/require-admin";
import {
  getPreviewPost,
  getPreviewSiteProfile,
  previewRobots,
  resolveContentReadMode,
} from "@/server/content/preview";
import { BlogPostView } from "@/page-sections/blog/blog-post-view";
import {
  getPublishedPost,
  getPublishedSiteProfile,
  listPublishedPosts,
} from "@/server/content/public";

async function loadMode() {
  try {
    return await resolveContentReadMode();
  } catch {
    notFound();
  }
}

export async function generateStaticParams() {
  return (await listPublishedPosts()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mode = await loadMode();
  const post =
    mode === "draft"
      ? await getPreviewPost(slug, await requireAdmin())
      : await getPublishedPost(slug);

  if (!post) return {};

  return {
    title: post.seo.title,
    description: post.seo.description,
    ...(mode === "draft" ? { robots: previewRobots } : {}),
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mode = await loadMode();
  const admin = mode === "draft" ? await requireAdmin() : null;
  const [post, profile, posts] = await Promise.all([
    admin ? getPreviewPost(slug, admin) : getPublishedPost(slug),
    admin ? getPreviewSiteProfile(admin) : getPublishedSiteProfile(),
    listPublishedPosts(),
  ]);

  if (!post || !profile) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <BlogPostView
        morePosts={posts.filter((item) => item.slug !== post.slug).slice(0, 2)}
        post={post}
        profile={profile}
      />
    </>
  );
}
