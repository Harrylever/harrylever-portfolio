import { cn } from "@heroui/theme";

import { title } from "@/components/primitives";

const skills: string[] = [
  // Frontend (Web & Mobile)
  "React",
  "Next.js",
  "Remix.run",
  "Vite",
  "Gatsby",
  "Tailwind CSS",
  "Tamagui",
  "Material UI",
  "Shadcn UI",
  "HeroUI",
  "Bootstrap",
  "React Native",
  "Expo",

  // Languages
  "Javascript",
  "Typescript",
  "Python",

  // Backend & APIs
  "Node.js",
  "NestJS",
  "Express",
  "FastAPI",
  "GraphQL",
  "REST API design",
  "Convex",

  // Databases & Caching
  "PostgreSQL",
  "MongoDB",
  "Redis",

  // Authentication & Payments
  "Clerk",
  "Paystack",
  "Flutterwave",

  // Cloud, DevOps & Deployment
  "Docker",
  "Git",
  "CI/CD",
  "GitHubActions",
  "CircleCI",
  "AWS",
  "GCP",
  "Azure",
  "Vercel",
  "Netlify",

  // Backend Services & Platforms
  "Supabase",
  "Firebase",
  "Hygraph CMS",

  // Testing & Code Quality
  "Jest",
  "ESLint",

  // Architecture & Product Engineering
  "SaaS architecture",
  "Multitenancy in SaaS",
  "System design",

  // AI & Integrations
  "Google AI / Gemini",
];

export const Skills = () => {
  return (
    <div className="grid w-full pb-14">
      <h3 className={cn(title({ size: "sm" }), "select-none")}>Skills</h3>

      <div className="mt-5 flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <div key={skill}>
            <p className="text-sm text-gray-500 hover:text-white transition-all duration-300 cursor-pointer">
              {skill}
              {index !== skills.length - 1 && ","}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
