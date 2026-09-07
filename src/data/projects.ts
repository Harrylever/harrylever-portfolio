import { ProjectDetail } from "@/types";

/* `hook`, `stack`, `status`, `href` and the image slot ids mirror ME.builds;
   this file adds the long-form detail. Only Shelta has a full body — the
   others fall back to their story paragraph. */
export const PROJECTS: ProjectDetail[] = [
  {
    slug: "shelta",
    name: "Shelta",
    year: "2024 —",
    role: "Solo — design, frontend, backend, ops",
    status: "Live",
    href: "https://sheltahomes.com",
    hook: "Students find verified housing — and now vetted local trades too.",
    stack: ["Next.js", "NestJS", "PostgreSQL", "Prisma", "Redis", "Paystack"],
    slot: "pj-shelta-lead",
    gallery: ["pj-shelta-a", "pj-shelta-b"],
    body: [
      {
        t: "p",
        c: "Finding a room near campus in Nigeria means trusting a stranger in a WhatsApp group. You send a deposit for a photo, and sometimes the room exists. I built Shelta because I had done that twice and got lucky twice.",
      },
      { t: "h2", c: "The actual problem was trust, not search" },
      {
        t: "p",
        c: "My first version was a search product — filters, map, sort by price. Nobody cared. The question renters asked in every conversation was some version of “is this person real”. So the product turned into a verification pipeline with a listings UI attached, rather than a listings site with verification bolted on.",
      },
      {
        t: "p",
        c: "Agents submit documents and get a reviewed status before a single listing goes public. Admin moderation is a first-class surface, not an afterthought — most of the backend complexity lives there.",
      },
      {
        t: "blockquote",
        c: "Verification is the feature renters talk about. Search is the thing they use.",
      },
      { t: "h2", c: "Then the users told me what to build next" },
      {
        t: "p",
        c: "People who found a room started asking the same agents for movers. Then tailors, welders, carpenters. The marketplace primitives already existed — a verified provider, a listing, a moderated profile — so a local services layer was mostly a content model change and a lot of copy.",
      },
      { t: "h3", c: "What the stack looks like" },
      {
        t: "ul",
        c: [
          "Next.js front end, NestJS API, PostgreSQL through Prisma.",
          "Redis and BullMQ for anything slow: image processing, notification fan-out, document checks.",
          "Paystack for deposits; Cloudinary for the listing media.",
        ],
      },
      { t: "h2", c: "What I'd do differently" },
      {
        t: "p",
        c: "I modelled listings before I understood the verification flow, so the schema fought me for months. I would build the agent lifecycle first now and let listings hang off it. I also shipped without a moderation queue and spent a week doing it by hand in a database client — instructive, not repeatable.",
      },
    ],
  },
  {
    slug: "aizen",
    name: "AIZEN",
    year: "2025 — 2026",
    role: "Capstone — solo",
    status: "Capstone · no public link",
    hook: "Reads a codebase, then proves the vulnerability in a sandbox before reporting it.",
    stack: ["Python", "Tree-sitter", "LangGraph", "Docker", "RAG"],
    slot: "pj-aizen-lead",
    body: [
      {
        t: "p",
        c: "My capstone. The first version pattern-matched source text and found plenty of nothing. Parsing the AST with Tree-sitter and then attempting each candidate exploit inside a disposable Docker container is what made the output worth reading.",
      },
      {
        t: "p",
        c: "LangGraph orchestrates the decision of when a finding is worth spinning up a container, since verification is by far the expensive stage. Findings ship with the transcript attached or they get downgraded.",
      },
    ],
  },
  {
    slug: "sakzpredict",
    name: "SakzPredict",
    year: "2026 —",
    role: "Solo — learning in public",
    status: "In progress",
    hook: "An onchain market for memecoin outcomes, written in Rust on Solana.",
    stack: ["Rust", "Anchor", "Solana"],
    slot: "pj-sakz-lead",
    body: [
      {
        t: "p",
        c: "The one I am in the middle of. I picked a problem that holds real money specifically so I could not be lazy about correctness while learning Rust.",
      },
      {
        t: "p",
        c: "Ownership and lifetimes have humbled me roughly once a week since I started. Anchor removes a lot of boilerplate and none of the thinking.",
      },
    ],
  },
  {
    slug: "fola",
    name: "Fola",
    year: "2025",
    role: "Hackathon — DevCareer × Nomba",
    status: "Hackathon",
    hook: "Takes a payment inside the WhatsApp chat a merchant already sells in.",
    stack: ["Node.js", "Express", "Paystack", "Redis"],
    slot: "pj-fola-lead",
    body: [
      {
        t: "p",
        c: "Built in a weekend. We started designing an app and realised the merchants we were describing already had a working storefront: a WhatsApp thread with a customer in it.",
      },
      {
        t: "p",
        c: "So the product became a payment flow inside the conversation. The lesson was that the app was never the product.",
      },
    ],
  },
  {
    slug: "priceit",
    name: "PriceIt",
    year: "2025",
    role: "Solo",
    status: "Live",
    href: "https://priceit.app",
    hook: "Point a camera at a price tag and find out if you are being overcharged.",
    stack: ["Expo", "React Native", "Gemini", "Prisma"],
    slot: "pj-priceit-lead",
    body: [
      {
        t: "p",
        c: "A small tool that came out of being annoyed in a market. Expo for the app, Gemini doing the reading, a thin API keeping a price history so the comparison means something.",
      },
    ],
  },
  {
    slug: "crystalizer",
    name: "Crystalizer Fertilizer",
    year: "2024",
    role: "Client work",
    status: "Live",
    href: "https://crystalizer.net",
    hook: "A fertilizer producer's whole catalogue, blog and gallery, built to be found.",
    stack: ["Next.js", "Tailwind CSS"],
    slot: "pj-crystalizer-lead",
    body: [
      {
        t: "p",
        c: "Client work, and the project that taught me how much of shipping is content modelling rather than code. Dynamic product and blog content, an interactive gallery, and an SEO-shaped multi-page build.",
      },
    ],
  },
];

export function getProject(slug: string) {
  return PROJECTS.find((p) => p.slug === slug);
}
