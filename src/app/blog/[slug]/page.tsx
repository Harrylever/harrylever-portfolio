import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogPostView } from "@/page-sections/blog/blog-post-view";
import {
  getPublishedPost,
  getPublishedSiteProfile,
  listPublishedPosts,
} from "@/server/content/public";

export async function generateStaticParams() {
  return (await listPublishedPosts()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) return {};

  return { title: post.seo.title, description: post.seo.description };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, profile, posts] = await Promise.all([
    getPublishedPost(slug),
    getPublishedSiteProfile(),
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
