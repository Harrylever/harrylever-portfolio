import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type NowItem = {
  label: string;
  body: string;
};

export type Build = {
  name: string;
  hook: string;
  story: string;
  stack: string[];
  status: string;
  href?: string;
  slot: string;
  aspect: string;
};

export type Frame = {
  slot: string;
  aspect: string;
  caption: string;
};

export type AiTool = {
  tool: string;
  use: string;
  freq: "Every day" | "Sometimes" | "Rarely";
};

export type ReachGroup = {
  label: string;
  items: string[];
};

export type WorkExperience = {
  company: string;
  role: string;
  period: string;
  stack: string[];
};

export type SocialLink = {
  label: string;
  href: string;
};

export type Me = {
  name: string;
  location: string;
  intro: { w: string; e?: boolean }[];
  lede: string;
  now: NowItem[];
  builds: Build[];
  frames: Frame[];
  aiNote: string;
  ai: AiTool[];
  reach: ReachGroup[];
  worked: WorkExperience[];
  links: SocialLink[];
};

export type PostBlock =
  | { t: "p" | "h2" | "h3" | "blockquote"; c: string }
  | { t: "ul" | "ol"; c: string[] }
  | { t: "pre"; c: string };

export type Post = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  year: string;
  readingTime: string;
  tag: string;
  body?: PostBlock[];
};

export type ProjectDetail = {
  slug: string;
  name: string;
  year: string;
  role: string;
  status: string;
  href?: string;
  hook: string;
  stack: string[];
  slot: string;
  gallery?: string[];
  body: PostBlock[];
};
