import type {
  HomeSectionContent,
  HomeSectionType,
} from "@/domain/content/home";
import type { PostContent } from "@/domain/content/post";
import type { ProjectContent, ProjectMetric } from "@/domain/content/project";
import type {
  RichTextBlockNode,
  RichTextDocument,
  RichTextParagraphNode,
} from "@/domain/content/rich-text";
import type { SiteProfileContent } from "@/domain/content/site-profile";

/* The repositioning copy (see docs/superpowers/specs/2026-10-15-*). Pure:
   no database access. Every claim here comes from the owner's answers or
   from the repositories checked while writing the spec. */

/** The date the traction numbers below were read from their sources. */
export const REPOSITIONING_AS_OF = "2026-10-15";

export function repositioningSiteProfile(
  base: SiteProfileContent,
): SiteProfileContent {
  return {
    ...base,
    tagline:
      "Product-minded software engineer building software that makes student and Nigerian life easier.",
    description:
      "Dean Ukanah is a product-minded software engineer in Abuja and co-founder of Shelta, verified off-campus housing for students. Product and engineering end to end, open to remote contract work.",
  };
}

function section<T extends HomeSectionType>(
  base: ReadonlyMap<HomeSectionType, HomeSectionContent>,
  type: T,
): Extract<HomeSectionContent, { type: T }> {
  const found = base.get(type);

  if (!found) throw new Error(`Missing ${type} section; run db:seed first`);

  return found as Extract<HomeSectionContent, { type: T }>;
}

/** Skills the owner cannot back with shipped work; never shown. */
const droppedTools = new Set(["LangGraph"]);

const frameCaptions = [
  "At the desk.",
  "Abuja.",
  "A working session.",
  "Debugging.",
];

export function repositioningHomeSections(
  base: ReadonlyMap<HomeSectionType, HomeSectionContent>,
): HomeSectionContent[] {
  const intro = section(base, "intro");
  const reach = section(base, "reach");
  const loop = section(base, "loop");
  const frames = section(base, "frames");
  const say = section(base, "say");
  let placeholderIndex = 0;

  return [
    {
      ...intro,
      statement: [
        { text: "I build software that makes" },
        { text: "student and Nigerian life easier.", emphasis: true },
      ],
      lede: "Co-founder and Head of Product and Engineering at Shelta, verified off-campus housing for students. I own product and engineering end to end, and I am a final-year Cybersecurity student at FUTMinna.",
    },
    {
      type: "now",
      heading: "Right now",
      note: "Where things stand in October 2026.",
      items: [
        {
          label: "Building",
          body: "Shelta, live at FUTMinna and Minna. The mobile app has passed closed testing and is in Google Play production review.",
        },
        {
          label: "Next",
          body: "Tracking every apartment by lodge, with address and flat number, so landlords and agents run their day on Shelta.",
        },
        {
          label: "Studying",
          body: "BTech Cyber Security Science, Federal University of Technology Minna, 2027.",
        },
        {
          label: "Exploring",
          body: "AIZEN, an idea for vulnerability analysis software, with no code yet. Solana and Rust through small experiments, to learn unfamiliar technology.",
        },
      ],
    },
    {
      type: "built",
      heading: "Things I've built",
      note: "Shelta first, then client work and smaller products.",
      ctaLabel: "Read the full write-ups",
    },
    {
      ...frames,
      note: "Abuja and the desk. Scroll sideways.",
      items: frames.items.map((item) =>
        "placeholderSlot" in item
          ? {
              ...item,
              caption: frameCaptions[placeholderIndex++ % frameCaptions.length],
            }
          : item,
      ),
    },
    {
      ...reach,
      note: "Grouped by how often I use it.",
      groups: reach.groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !droppedTools.has(item)),
        }))
        .filter((group) => group.items.length > 0)
        .map((group) => {
          if (group.label === "Currently learning") {
            return { ...group, label: "Exploring" };
          }
          if (group.label === "When it fits" && !group.items.includes("Go")) {
            return { ...group, items: [...group.items, "Go"] };
          }

          return group;
        }),
      experienceIntro:
        "At Clique, a learning management system for K–12 schools, I implemented requirements. At Provarex, Jejelove Solutions and Stanrute Technologies, I also helped shape scope and priorities.",
      experiences: [
        {
          company: "Clique",
          role: "Mid-level Full-Stack Engineer",
          period: "Jul 2024 – Jan 2026",
          stack: ["TypeScript", "React", "NestJS", "PostgreSQL"],
        },
        {
          company: "Provarex Innovations",
          role: "Engineering Lead",
          period: "May 2024 – Aug 2024",
          stack: ["React", "Next.js", "Tailwind CSS"],
        },
        {
          company: "Jejelove Solutions",
          role: "Full-Stack Engineer",
          period: "Mar 2023 – Jul 2023",
          stack: ["React", "Next.js", "Tailwind CSS"],
        },
        {
          company: "Stanrute Technologies",
          role: "Backend Engineer",
          period: "Nov 2022 – Feb 2023",
          stack: ["Node.js", "Express", "NestJS", "MongoDB"],
        },
      ],
    },
    {
      ...loop,
      items: loop.items.filter(({ tool }) => !droppedTools.has(tool)),
      heading: "AI, built and used",
      note: "PriceIt is the product work. The tools are how I build.",
      intro:
        "PriceIt, a crowdsourced price index for Nigerian shoppers, uses Gemini Vision to read receipt and shelf-tag photos, and a trust-weighted consensus engine to turn submissions into a verified price. I also build with AI tools most days.",
      footer: undefined,
    },
    {
      ...say,
      heading:
        "Working on a problem worth solving, in any sector, or need a product engineer on contract? I'd like to hear from you.",
      availability:
        "Open to remote contract product-engineering work, Abuja also fine, and to a cybersecurity internship.",
      investorNote: "Investors: I'm happy to talk about Shelta.",
      // The résumé link comes from the RESUME_URL environment variable.
      resumeUrl: undefined,
    },
  ];
}

type Block = RichTextBlockNode;

const text = (value: string) => ({ type: "text" as const, text: value });
const heading = (value: string): Block => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});
const paragraph = (value: string): RichTextParagraphNode => ({
  type: "paragraph",
  content: [text(value)],
});
const bullets = (items: string[]): Block => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem" as const,
    content: [paragraph(item)],
  })),
});
const doc = (...blocks: Block[]): RichTextDocument => ({
  type: "doc",
  content: blocks,
});

const metric = (label: string, value: string): ProjectMetric => ({
  label,
  value,
  asOf: REPOSITIONING_AS_OF,
});

type RepositioningProject = {
  slug: string;
  content: ProjectContent;
  featured: boolean;
  featuredOrder: number | null;
  displayOrder: number;
};

function project(
  slug: string,
  order: number,
  featured: boolean,
  content: Omit<
    ProjectContent,
    | "coverAssetId"
    | "coverPlaceholder"
    | "homepagePlaceholder"
    | "galleryAssetIds"
  >,
): RepositioningProject {
  return {
    slug,
    featured,
    featuredOrder: featured ? order : null,
    displayOrder: order,
    content: {
      ...content,
      coverAssetId: null,
      coverPlaceholder: { slotId: `pj-${slug}-lead`, aspectRatio: "3 / 2" },
      homepagePlaceholder: { slotId: `build-${slug}`, aspectRatio: "3 / 2" },
      galleryAssetIds: [],
    },
  };
}

export const repositioningProjects: readonly RepositioningProject[] = [
  project("shelta", 1, true, {
    name: "Shelta",
    hook: "Verified off-campus housing for students, so finding a room near campus does not mean trusting a stranger.",
    homepageStory:
      "Students get scammed looking for accommodation off campus. Shelta lists verified rooms and backs them with agent verification, inspections and key handover, on web and mobile. It launched in November 2025, slowed on funding, and picked back up in May 2026. A team of four, bootstrapped from personal and family funds.",
    year: "2025 — present",
    role: "Co-founder, Head of Product and Engineering",
    displayStatus: "Live",
    kind: "product",
    statusTone: "live",
    metrics: [
      metric("Registered users", "227"),
      metric("Community members", "1,051"),
      metric("Listings", "100+"),
      metric("Agents onboarded", "5"),
      metric("Campus (FUTMinna / Minna)", "1"),
    ],
    externalUrl: "https://sheltahomes.com",
    stack: [
      "Next.js",
      "Expo",
      "NestJS",
      "Prisma",
      "PostgreSQL",
      "Clerk",
      "Redis",
      "BullMQ",
      "Paystack",
      "Google Cloud Storage",
    ],
    seo: {
      title: "Shelta — verified student housing",
      description:
        "Shelta is verified off-campus housing for students in Minna, built by a team of four. Product and engineering by its co-founder.",
    },
    caseStudy: doc(
      heading("The problem"),
      paragraph(
        "Students get scammed while looking for accommodation off campus. Shelta exists so a student can find a room that has been verified, without trusting a stranger.",
      ),
      heading("What I assumed wrongly"),
      paragraph(
        "I assumed housing agents would want to come on board. Most sounded excited about the idea and then resisted onboarding. What worked was bringing one agent in as an internal part of the Shelta team.",
      ),
      heading("More than an app"),
      paragraph(
        "Operations moved from online services to physical ones: inspections, verification and key handover. That is how we keep service dependable for students and agents.",
      ),
      heading("Where it stands"),
      bullets([
        "Launched on 11 November 2025. Progress slowed on funding and resumed in May 2026.",
        "The mobile app has passed closed testing and is in Google Play production review.",
        "About ten months of work, funded with personal and family money.",
      ]),
      heading("What I would do differently"),
      paragraph(
        "Build closer to landlords and make Shelta something they cannot run without: every apartment tracked per lodge, with its address and flat number.",
      ),
    ),
  }),
  project("karrigo", 2, true, {
    name: "Karrigo",
    hook: "Food and groceries delivery for Makurdi, with customer and partner apps behind one API.",
    homepageStory:
      "A delivery platform for food and groceries in Makurdi. I built the backend and both mobile apps: the customer app, and the partner app that kitchens, stores and riders use.",
    year: "2026",
    role: "Backend and mobile engineer, contract",
    displayStatus: "Live",
    kind: "client",
    statusTone: "live",
    externalUrl: "https://karrigo.app",
    livePreview: true,
    stack: [
      "Expo",
      "React Native",
      "NestJS",
      "Prisma",
      "PostgreSQL",
      "Redis",
      "Paystack",
    ],
    seo: {
      title: "Karrigo — food and groceries delivery",
      description:
        "Karrigo delivers food and groceries in Makurdi. I built its NestJS backend and both mobile apps.",
    },
    caseStudy: doc(
      paragraph(
        "Karrigo is a delivery platform for food and groceries in Makurdi, live at karrigo.app. One NestJS service serves customers, the kitchens, stores and riders in the partner app, and the Karrigo team.",
      ),
      paragraph(
        "My part: the backend API and both mobile applications, the customer app and the partner app.",
      ),
    ),
  }),
  project("libra-cleaning", 3, true, {
    name: "Libra Cleaning",
    hook: "A cleaning-service platform whose backend I built in Go, nearly ready to launch.",
    homepageStory:
      "Backend for a cleaning-service MVP: a Go modular monolith with separate API and worker processes. In development and close to launch.",
    year: "2026",
    role: "Backend engineer, contract",
    displayStatus: "In development, nearly live",
    kind: "client",
    stack: ["Go", "PostgreSQL"],
    seo: {
      title: "Libra Cleaning — backend",
      description:
        "I built the Go backend for Libra Cleaning, a cleaning-service MVP now close to launch.",
    },
    caseStudy: doc(
      paragraph(
        "Libra Cleaning is a cleaning-service MVP. I built its backend as a Go modular monolith, with API and worker processes that share domain and platform packages.",
      ),
      paragraph("It is in development and close to launch."),
    ),
  }),
  project("upskill-simulator", 4, true, {
    name: "Upskill Simulator",
    hook: "A practice platform for the Cardtonic upskill challenge.",
    homepageStory:
      "Users could practise the Cardtonic upskill assessment for free, or pay ₦1,000. I kept it running for the length of the challenge.",
    year: "2026",
    role: "Product and engineering",
    displayStatus: "Closed after the challenge",
    kind: "product",
    statusTone: "ended",
    metrics: [metric("Users", "67"), metric("Revenue", "₦38,000")],
    stack: ["Next.js", "NestJS", "Prisma", "Redis", "BullMQ", "Clerk"],
    seo: {
      title: "Upskill Simulator — practice platform",
      description:
        "A practice platform for the Cardtonic upskill challenge: 67 users and ₦38,000 in revenue.",
    },
    caseStudy: doc(
      paragraph(
        "Upskill Simulator let people practise the Cardtonic upskill assessment for free, or pay ₦1,000. It ran for the duration of the Cardtonic upskill challenge, with 67 users and ₦38,000 in revenue.",
      ),
    ),
  }),
  project("priceit", 5, true, {
    name: "PriceIt",
    hook: "A crowdsourced price index for Nigerian shoppers, built from photos of receipts and shelf tags.",
    homepageStory:
      "Users photograph a receipt or shelf tag, Gemini Vision reads the price, and a trust-weighted consensus engine turns submissions into a verified price. It began as a scraper of Jumia, Konga and Jiji; I dropped that on 27 August 2026 over legal risk and no real moat, and rebuilt it around crowdsourced data. Paused.",
    year: "2025",
    role: "Product and engineering",
    displayStatus: "Paused",
    kind: "product",
    statusTone: "paused",
    stack: ["Expo", "Clerk", "FastAPI", "PostgreSQL", "Gemini Vision"],
    seo: {
      title: "PriceIt — crowdsourced prices",
      description:
        "PriceIt reads receipt and shelf-tag photos with Gemini Vision and builds a verified price index. Paused.",
    },
    caseStudy: doc(
      heading("What it was"),
      paragraph(
        "Everyday shoppers pay excessive prices for consumer goods. PriceIt let people photograph a receipt or shelf tag; Gemini Vision read the price server-side, and a trust-weighted consensus engine produced a verified price per product, store and area.",
      ),
      heading("What I learned"),
      paragraph(
        "The first version scraped e-commerce sites. I dropped that on 27 August 2026: scraping risked terms-of-service problems, and a stack of pieced-together tools was no moat. Crowdsourcing also reaches informal markets that have no website to scrape. The product is paused.",
      ),
    ),
  }),
  project("aizen", 6, true, {
    name: "AIZEN",
    hook: "An idea for vulnerability analysis software that pentests codebases in isolated environments.",
    homepageStory:
      "Vulnerability analysis software that pentests small and enterprise codebases in isolated environments and returns industry-standard reports. Early ideation; there is no code yet.",
    year: "2026",
    role: "Idea stage",
    displayStatus: "Exploring",
    kind: "experiment",
    stack: ["Not yet chosen"],
    seo: {
      title: "AIZEN — an idea in exploration",
      description:
        "AIZEN is an idea for vulnerability analysis software that pentests codebases in isolated environments. No code yet.",
    },
    caseStudy: doc(
      paragraph(
        "AIZEN is vulnerability analysis software that pentests small and enterprise codebases in isolated environments and returns industry-standard reports.",
      ),
      paragraph(
        "It is in ideation. There is no code yet, and this page will change when there is.",
      ),
    ),
  }),
  project("fola", 7, false, {
    name: "Fola",
    hook: "Takes a payment inside the WhatsApp chat a merchant already sells in.",
    homepageStory:
      "Built in a weekend for the DevCareer × Nomba hackathon. The lesson was that the app was never the product; the chat was. Discontinued.",
    year: "2025",
    role: "Hackathon — DevCareer × Nomba",
    displayStatus: "Discontinued",
    kind: "product",
    statusTone: "ended",
    stack: ["Node.js", "Express", "Paystack", "Redis"],
    seo: {
      title: "Fola — payments inside WhatsApp",
      description:
        "Fola took payments inside the WhatsApp chat a merchant already sells in. A hackathon build, now discontinued.",
    },
    caseStudy: doc(
      heading("What I learned"),
      paragraph(
        "We started designing an app and realised the merchants we were describing already had a working storefront: a WhatsApp thread with a customer in it. So the product became a payment flow inside the conversation. The app was never the product. Fola is discontinued.",
      ),
    ),
  }),
  project("crystalizer", 8, false, {
    name: "Crystalizer Fertilizer",
    hook: "A fertilizer producer's whole catalogue, blog and gallery, built to be found.",
    homepageStory:
      "Client work, and the project that taught me how much of shipping is content modelling rather than code.",
    year: "2024",
    role: "Client work",
    displayStatus: "Live",
    kind: "client",
    statusTone: "live",
    externalUrl: "https://crystalizer.net",
    livePreview: true,
    stack: ["Next.js", "Tailwind CSS"],
    seo: {
      title: "Crystalizer Fertilizer — website",
      description:
        "A catalogue, blog and gallery site for a fertilizer producer, built with Next.js.",
    },
    caseStudy: doc(
      paragraph(
        "Client work, and the project that taught me how much of shipping is content modelling rather than code. Dynamic product and blog content, an interactive gallery, and an SEO-shaped multi-page build.",
      ),
    ),
  }),
];

export function repositioningPost(): { slug: string; content: PostContent } {
  const prompt = (value: string) => paragraph(`Write this section: ${value}`);

  return {
    slug: "student-housing-in-nigeria",
    content: {
      title: "[Draft] Why finding a room near campus feels like a gamble",
      summary:
        "Outline only, not ready to publish. How students near FUTMinna look for housing, why the usual routes leave them exposed to scams, and what a small survey and months of building Shelta suggest.",
      tag: "Student housing",
      coverAssetId: null,
      seo: {
        title: "[Draft] Why finding a room near campus feels like a gamble",
        description:
          "How students near FUTMinna find housing, why scams follow the usual routes, and what a small survey and building Shelta suggest.",
      },
      document: doc(
        heading("The problem"),
        prompt(
          "a student near FUTMinna needs a room and has few safe ways to find one. Open with a real scene.",
        ),
        heading("Why the usual fixes fail"),
        prompt(
          "social posts, referrals and agents' photos, where money moves before anyone sees the room.",
        ),
        heading("Trust runs between people"),
        prompt(
          "software supports that. Explain how agents, inspections and key handover follow from it.",
        ),
        heading("What I got wrong"),
        prompt(
          "I assumed agents would be eager; embedding one agent in the team broke the deadlock.",
        ),
        heading("What the numbers say"),
        paragraph(
          "A small survey of 24 students, 62% from FUT Minna and mostly 300L. Treat it as a directional signal, not a representative study.",
        ),
        bullets([
          "8 of 24 (33%) had been scammed or hit a fraudulent listing.",
          "22 of 24 (92%) would probably or definitely use a student housing platform.",
          "17 of 24 (71%) would probably or definitely pay ₦1,000–₦3,000 for verified listings; none said no.",
          "The top worries about a new platform were payment security (16) and fake listings (14).",
          "The most valued features were safety and security information (14), student reviews (11) and verified listings with photos (9).",
          "WhatsApp was the preferred channel for 23 of 24.",
        ]),
        prompt(
          "add Shelta's own numbers: 227 registered users, a 1,051-member community, 100+ listings, 5 agents.",
        ),
        heading("What is next"),
        prompt(
          "tracking every apartment per lodge, with address and flat number.",
        ),
      ),
    },
  };
}
