import { Me } from "@/types";

/* First person, present tense, no recruiter framing. */
export const ME: Me = {
  name: "Dean Ukanah",
  location: "Abuja, Nigeria",
  intro: [
    { w: "I" },
    { w: "build" },
    { w: "things" },
    { w: "I" },
    { w: "want" },
    { w: "to" },
    { w: "exist" },
    { w: "—" },
    { w: "then" },
    { w: "I" },
    { w: "try", e: true },
    { w: "to", e: true },
    { w: "break", e: true },
    { w: "them.", e: true },
  ],
  lede: "Indie hacker and software engineer in Abuja. I ship small products end to end — housing, payments, price data, onchain markets — and I am finishing a cybersecurity degree, which mostly means I have learned to distrust my own code.",
  now: [
    {
      label: "Building",
      body: "SakzPredict — an onchain prediction market on Solana. I am learning Rust and Anchor by shipping something that holds real money, which is either brave or stupid.",
    },
    {
      label: "Running",
      body: "Shelta, live and used. Students find verified housing; lately they also find movers, tailors, welders and carpenters.",
    },
    {
      label: "Studying",
      body: "Final year of a cybersecurity degree at FUTMinna. My capstone, AIZEN, reads a codebase and then tries to exploit it in a sandbox to prove the finding is real.",
    },
    {
      label: "Pairing with",
      body: "Claude and Claude Code, most of the day. Half of what I ship now starts as an argument with a model about whether my approach is actually good.",
    },
    {
      label: "Reading",
      body: "Parsers, taint analysis, and far too many Solana program postmortems.",
    },
  ],
  builds: [
    {
      name: "Shelta",
      hook: "Students find verified housing — and now vetted local trades too.",
      story:
        "I started it because finding a room near campus meant trusting a stranger on WhatsApp. It is live, people use it, and the verification flow is the part they talk about.",
      stack: ["Next.js", "NestJS", "PostgreSQL"],
      status: "Live",
      href: "https://sheltahomes.com",
      slot: "build-shelta",
      aspect: "3 / 2",
    },
    {
      name: "AIZEN",
      hook: "Reads a codebase, then proves the vulnerability in a sandbox before reporting it.",
      story:
        "My capstone. The first version pattern-matched source text and found nothing real. Parsing the AST and verifying exploits in Docker is what made the output worth reading.",
      stack: ["Python", "LangGraph", "Docker"],
      status: "Capstone",
      slot: "build-aizen",
      aspect: "3 / 2",
    },
    {
      name: "Fola",
      hook: "Takes a payment inside the WhatsApp chat a merchant already sells in.",
      story:
        "Built in a weekend for the DevCareer × Nomba hackathon. The lesson was that the app was never the product — the chat was.",
      stack: ["Node.js", "Paystack", "Redis"],
      status: "Hackathon",
      slot: "build-fola",
      aspect: "3 / 2",
    },
    {
      name: "PriceIt",
      hook: "Point a camera at a price tag and find out if you are being overcharged.",
      story:
        "A small tool that came out of being annoyed in a market. Ships as an Expo app with Gemini doing the reading.",
      stack: ["Expo", "Gemini", "Prisma"],
      status: "Live",
      href: "https://priceit.app",
      slot: "build-priceit",
      aspect: "3 / 2",
    },
    {
      name: "SakzPredict",
      hook: "An onchain market for memecoin outcomes, written in Rust on Solana.",
      story:
        "The one I am in the middle of. Ownership and lifetimes have humbled me roughly once a week since I started.",
      stack: ["Rust", "Anchor", "Solana"],
      status: "In progress",
      slot: "build-sakz",
      aspect: "3 / 2",
    },
    {
      name: "Crystalizer",
      hook: "A fertilizer producer's whole catalogue, blog and gallery, built to be found.",
      story:
        "Client work, and the project that taught me how much of shipping is content modelling rather than code.",
      stack: ["Next.js", "Tailwind CSS"],
      status: "Live",
      href: "https://crystalizer.net",
      slot: "build-crystalizer",
      aspect: "3 / 2",
    },
  ],
  frames: [
    {
      slot: "frame-desk",
      aspect: "4 / 5",
      caption: "Where most of it gets written.",
    },
    {
      slot: "frame-abuja",
      aspect: "1 / 1",
      caption: "Abuja, on a good evening.",
    },
    {
      slot: "frame-ship",
      aspect: "1 / 1",
      caption: "The hackathon weekend that became Fola.",
    },
    {
      slot: "frame-screen",
      aspect: "4 / 5",
      caption: "Debugging something that deserved it.",
    },
  ],
  aiNote:
    "I write software with a model open next to me most of the day. Not as a novelty — as the tool I reach for between having an idea and having something running. It changed how much I attempt alone.",
  ai: [
    {
      tool: "Claude",
      use: "Thinking out loud. Architecture I am unsure about, code review on my own work, and the honest second opinion I would otherwise wait a day for.",
      freq: "Every day",
    },
    {
      tool: "Claude Code",
      use: "Where most of the actual building happens now — refactors across files, tests I would have skipped, and the boring plumbing that used to eat my evenings.",
      freq: "Every day",
    },
    {
      tool: "Antigravity",
      use: "Occasionally, when I want a different agent's take on the same problem.",
      freq: "Sometimes",
    },
    {
      tool: "Cursor",
      use: "Rarely. It is good; I just settled somewhere else.",
      freq: "Rarely",
    },
  ],
  reach: [
    {
      label: "Every day",
      items: [
        "TypeScript",
        "React",
        "Next.js",
        "NestJS",
        "PostgreSQL",
        "Tailwind CSS",
      ],
    },
    {
      label: "Often",
      items: ["React Native", "Expo", "Prisma", "Redis", "BullMQ", "Docker"],
    },
    {
      label: "When it fits",
      items: ["Python", "Gemini", "RAG", "LangGraph", "Paystack", "Clerk"],
    },
    { label: "Currently learning", items: ["Rust", "Anchor", "Solana"] },
    {
      label: "AI in the loop",
      items: ["Claude", "Claude Code", "Gemini", "RAG", "LangGraph"],
    },
  ],
  worked: [
    {
      company: "Clique",
      role: "Full-Stack Software Engineer",
      period: "2024 — 2026",
      stack: ["TypeScript", "React", "NestJS", "PostgreSQL"],
    },
    {
      company: "Provarex Innovations",
      role: "Engineering Lead",
      period: "2024",
      stack: ["React", "Next.js", "Tailwind CSS"],
    },
    {
      company: "Jejelove Solutions",
      role: "Full-Stack Engineer, remote",
      period: "2023",
      stack: ["React", "Next.js", "Tailwind CSS"],
    },
    {
      company: "Stanrute Technologies",
      role: "Backend Engineer, remote",
      period: "2022 — 2023",
      stack: ["Node.js", "Express", "NestJS", "MongoDB"],
    },
  ],
  links: [
    { label: "GitHub", href: "https://github.com/harrylever" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/deanukanah/" },
    { label: "X", href: "https://x.com/onesiukanah" },
  ],
};
