"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { motion } from "framer-motion";
import { ExternalLink, FolderCode } from "lucide-react";
import { cn } from "@heroui/theme";

import { subtitle, title } from "@/components/primitives";
import { Project } from "@/types";

const projects: Project[] = [
  {
    name: "Quotura",
    description:
      "Built an AI-powered content summarization and essay generation platform for users seeking to write smarter and read faster. I developed the full-stack Next.js/FastAPI application with secure Clerk authentication, Paystack-integrated tiered subscription management, and a credit-based usage model. Integrated Google AI (Gemini) for advanced summarization and custom essay creation, enabling customizable formats and lengths. Solved challenges in user onboarding, access control, and payment tracking through robust REST APIs and background tasks. Helped users reduce reading and writing time, improve content quality, and streamline research—transforming how individuals and teams manage information and produce written work.",
    image: "/images/quotura.png",
    link: "https://youtu.be/KA4pT3wSKts",
    repository: "https://github.com/Harrylever/Quotura",
  },
  {
    name: "Wordlift",
    description:
      "Built an AI-powered content enhancement platform for writers and marketers struggling with producing SEO-optimized content efficiently. I developed the full-stack Next.js/FastAPI application with secure authentication, tiered subscription management (integrated with Paystack), and a credit-based usage system. Integrated Google AI (Gemini) for real-time writing suggestions, grammar/style correction, and content clarity improvements. Solved scalability and payment tracking challenges by implementing robust REST APIs and background tasks. Reduced content editing time for users from hours to minutes and improved content quality, enabling creators to publish more effectively and boost their reach.",
    link: "https://wordlift.vercel.app",
    image: "/images/wordlift.png",
    repository: "https://github.com/Harrylever/Wordlift",
  },
  {
    name: "Market Insight",
    description:
      "Built a SaaS platform for businesses seeking actionable market insights and strategic planning. I developed the full-stack Next.js/FastAPI application with AI-powered market simulation, SWOT analysis, and go-to-market strategy generation—integrating Google AI for advanced analytics. The system features secure authentication, Paystack-powered tiered subscriptions, and a credit-based usage model. Addressed challenges in scaling custom analytics and payment tracking by engineering robust REST APIs and asynchronous processing. Enabled businesses to reduce manual research time, improve their market strategies, and make data-driven decisions faster—empowering teams to outperform competitors and capture new growth opportunities.",
    link: "https://market-insight-alpha.vercel.app",
    image: "/images/market-insight.png",
    repository: "https://github.com/Harrylever/Market-Insight",
  },
  {
    name: "Express Typescript Starter Template",
    description:
      "A starter template for Express.js applications with TypeScript, Jest, and ESLint. It includes a basic Express.js server with a REST API, a database (PostgreSQL), and a Redis cache. The template is designed to be a starting point for new projects and can be easily customized to fit the needs of the project.",
    repository: "https://github.com/Harrylever/express-typescript-starter",
  },
];

export const Projects = () => {
  return (
    <div className="relative">
      <h3 className={cn(title({ size: "sm" }), "select-none")}>Projects</h3>

      <div className="mt-5 grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </div>
    </div>
  );
};

const ProjectCard = ({ project }: { project: Project }) => {
  const [seeMoreIsActive, setSeeMoreIsActive] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="w-fit group flex items-center gap-2 hover:gap-4 transition-all duration-300">
        <h4
          className={cn(
            "!w-fit group-hover:font-semibold transition-all duration-300 select-none",
            subtitle({ fullWidth: false }),
          )}
        >
          {project.name}
        </h4>
        {project.repository && (
          <a
            href={project.repository}
            rel="noopener noreferrer"
            target="_blank"
          >
            <FolderCode size={18} />
          </a>
        )}
        {project.link && (
          <a href={project.link} rel="noopener noreferrer" target="_blank">
            <ExternalLink size={17} />
          </a>
        )}
      </div>

      <div className="relative flex flex-col justify-between">
        {!seeMoreIsActive && (
          <p className="text-sm text-gray-500 max-w-[86%] sm:max-w-[80%] lg:max-w-none">
            {project.description.slice(0, 100)}...
          </p>
        )}

        <motion.div
          animate={{
            height: seeMoreIsActive ? "auto" : "0",
            opacity: seeMoreIsActive ? 1 : 0,
          }}
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-500">
              {`${project.description}`}{" "}
              {project.repository && (
                <a
                  className="text-[13px] text-gray-300/90 hover:text-white/90 transition-all duration-300"
                  href={project.repository}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  See repository
                </a>
              )}
            </p>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="light"
            onPress={() => setSeeMoreIsActive(false)}
          >
            See less
          </Button>
        </motion.div>

        {!seeMoreIsActive && (
          <Button
            className="absolute top-1/2 -translate-y-1/2 right-0 w-fit"
            size="sm"
            variant="light"
            onPress={() => setSeeMoreIsActive(true)}
          >
            See more
          </Button>
        )}
      </div>
    </div>
  );
};
