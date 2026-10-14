import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogIndex } from "@/page-sections/blog/blog-index";
import {
  getPublishedSiteProfile,
  listPublishedPosts,
} from "@/server/content/public";

export const metadata: Metadata = {
  title: "Blog",
};

export default async function BlogPage() {
  const [profile, posts] = await Promise.all([
    getPublishedSiteProfile(),
    listPublishedPosts(),
  ]);

  if (!profile) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <BlogIndex posts={posts} profile={profile} />
    </>
  );
}
