import { Metadata } from "next";

import { BlogIndex } from "@/page-sections/blog/blog-index";

export const metadata: Metadata = {
  title: "Blog",
};

export default function BlogPage() {
  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <BlogIndex />
    </>
  );
}
