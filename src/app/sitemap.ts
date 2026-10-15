import { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import {
  getPublishedHomepage,
  getPublishedSiteProfile,
  listPublishedPosts,
  listPublishedProjects,
} from "@/server/content/public";

function newestPublication(items: Array<{ publishedAt: Date }>) {
  return items.reduce<Date | undefined>(
    (latest, { publishedAt }) =>
      !latest || publishedAt > latest ? publishedAt : latest,
    undefined,
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profile, homepage, projects, posts] = await Promise.all([
    getPublishedSiteProfile(),
    getPublishedHomepage(),
    listPublishedProjects(),
    listPublishedPosts(),
  ]);
  const baseUrl = siteConfig.url;

  return [
    {
      url: baseUrl,
      lastModified: homepage?.publishedAt ?? profile?.publishedAt,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: newestPublication(projects),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...projects.map((project) => ({
      url: `${baseUrl}/projects/${project.slug}`,
      lastModified: project.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${baseUrl}/blog`,
      lastModified: newestPublication(posts),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
