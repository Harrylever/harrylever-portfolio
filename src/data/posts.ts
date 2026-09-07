import { Post } from "@/types";

/* Placeholder content — titles and summaries drawn from Dean's actual projects
   and stack. Only the first post has a full body; replace wholesale with real posts. */
export const POSTS: Post[] = [
  {
    slug: "tree-sitter-reading-code",
    title: "What Tree-sitter taught me about reading code I didn't write",
    summary:
      "Building AIZEN's AST layer changed how I review pull requests — and made me distrust grep.",
    date: "12 Mar 2026",
    year: "2026",
    readingTime: "8 min",
    tag: "Security",
    body: [
      {
        t: "p",
        c: "AIZEN, my capstone, has one job: look at a codebase it has never seen and say where it is likely to break under attack. The first version did what most tools do — matched patterns against source text. It found plenty. Almost none of it was real.",
      },
      { t: "h2", c: "Text search doesn't know what a function is" },
      {
        t: "p",
        c: "A regex for a dangerous call cannot tell you whether the argument is user-controlled, whether the call sits behind an auth guard, or whether the whole file is dead code nobody imports. It sees characters. Reviewers do not read characters; they read structure, and then they read intent.",
      },
      {
        t: "p",
        c: "Tree-sitter gave me the structure part cheaply. It parses incrementally, it is per-language, and it hands back a concrete syntax tree I can walk instead of a pile of match offsets. Suddenly the question stopped being “does this string appear” and became “does a tainted value reach this parameter”.",
      },
      { t: "h3", c: "The query that changed the tool" },
      {
        t: "pre",
        c: '(call_expression\n  function: (identifier) @fn\n  arguments: (arguments (identifier) @arg)\n  (#match? @fn "^(exec|spawn)$"))',
      },
      {
        t: "p",
        c: "Not clever. But paired with a taint pass over the tree, the false-positive rate fell far enough that the findings became worth reading — which is the only metric that matters for a security tool nobody is paid to use.",
      },
      {
        t: "blockquote",
        c: "A finding a developer ignores is worse than no finding at all. It teaches them to ignore the next one.",
      },
      { t: "h2", c: "Then: prove it" },
      {
        t: "p",
        c: "Structure narrows the field; it does not confirm anything. So AIZEN takes each surviving candidate into a sandboxed Docker container and attempts the exploit against a disposable copy of the app. If nothing happens, the finding is downgraded, not shipped. Confirmed ones arrive with the transcript attached.",
      },
      {
        t: "p",
        c: "That verification stage is slow, awkward and by far the most useful thing in the project. It is also why the LangGraph orchestration exists — something has to decide when a candidate is worth a container.",
      },
      { t: "h2", c: "What stuck" },
      {
        t: "ul",
        c: [
          "I read diffs structurally now: what calls this, what reaches it, what guards it.",
          "I distrust any tool that reports without demonstrating.",
          "Parsers are boring infrastructure and boring infrastructure is where the leverage is.",
        ],
      },
      {
        t: "p",
        c: "None of this is novel research. It is just the difference between a tool that produces output and a tool someone will actually act on.",
      },
    ],
  },
  {
    slug: "whatsapp-is-the-product",
    title: "For Nigerian micro-merchants, WhatsApp is the product",
    summary:
      "Fola started as an app. It shipped as a chat flow, because that's where the selling already happens.",
    date: "04 Feb 2026",
    year: "2026",
    readingTime: "6 min",
    tag: "Fintech",
  },
  {
    slug: "shipping-while-studying",
    title: "Shipping six products while finishing a degree",
    summary:
      "What I cut, what I automated, and the two habits that kept Shelta running through exam weeks.",
    date: "18 Dec 2025",
    year: "2025",
    readingTime: "5 min",
    tag: "Practice",
  },
  {
    slug: "rust-anchor-first-month",
    title: "My first month in Rust and Anchor",
    summary:
      "Notes from building SakzPredict on Solana as a TypeScript engineer — mostly about ownership.",
    date: "02 Nov 2025",
    year: "2025",
    readingTime: "9 min",
    tag: "Blockchain",
  },
  {
    slug: "queues-before-scale",
    title: "Reach for a queue before you think you need one",
    summary:
      "BullMQ and Redis turned Shelta's slowest endpoints into background work in an afternoon.",
    date: "21 Aug 2025",
    year: "2025",
    readingTime: "6 min",
    tag: "Backend",
  },
  {
    slug: "verified-agents",
    title: "Verification is a product feature, not a checkbox",
    summary:
      "Why Shelta's agent vetting flow is the part renters actually talk about.",
    date: "09 May 2025",
    year: "2025",
    readingTime: "4 min",
    tag: "Product",
  },
];

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug);
}
