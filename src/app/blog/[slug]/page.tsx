import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogPostView } from "@/page-sections/blog/blog-post-view";
import { getPost, POSTS } from "@/data/posts";

export function generateStaticParams() {
  return POSTS.filter((p) => p.body).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) return {};

  return { title: post.title, description: post.summary };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post || !post.body) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <BlogPostView post={post} />
    </>
  );
}
