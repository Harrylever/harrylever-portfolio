"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ExternalLink, FolderCode } from "lucide-react"
import clsx from "clsx"

import { subtitle, title } from "@/components/primitives"
import { Project } from "@/types"

const projects: Project[] = [
  {
    name: "PriceIt: AI Price Scanner",
    description:
      "Built a mobile-first AI-powered price verification platform that helps users instantly scan and compare product prices to avoid overpaying. Developed using Expo, Convex, and Clerk, the app enables real-time price submissions, intelligent price aggregation, and location-aware insights. Implemented a fast, intuitive scanning flow with a community-driven data model to ensure pricing accuracy and transparency. Solved challenges around data consistency, real-time updates, and user trust by designing a scalable backend and seamless UX. Empowering everyday consumers to make smarter purchasing decisions while promoting price transparency in local markets.",
    link: "https://www.priceit.app",
  },

  {
    name: "Shelta: Shelta Homes & Ventures",
    description:
      "Built a student-focused housing platform connecting renters with verified agents to access affordable apartments. Developed a scalable full-stack web application featuring user onboarding and agent verification, apartment listings with strict validations, secure authentication, and admin moderation tools. Designed the system to improve trust, reduce housing search friction, and streamline the rental process for students—making housing discovery faster, safer, and more transparent.",
    image: "/images/shelta.jpg",
    link: "https://www.sheltahomes.com",
  },
  {
    name: "Crystalizer Fertilizer",
    description:
      "A corporate website for Crystalizer Nigeria Limited, a leading fertilizer production company. I developed a responsive, multi-page Next.js application featuring dynamic content management for blog posts and products, an interactive gallery, and optimized SEO performance. The site showcases their 20+ years of agricultural impact, product catalog (NPK, Kieserite), and commitment to Nigerian farmers, providing a professional digital presence to connect with stakeholders and expand their market reach.",
    link: "https://www.crystalizer.net",
  },
  {
    name: "Quotura",
    description:
      "Built an AI-powered content summarization and essay generation platform for users seeking to write smarter and read faster. I developed the full-stack Next.js/FastAPI application with secure Clerk authentication, Paystack-integrated tiered subscription management, and a credit-based usage model. Integrated Google AI (Gemini) for advanced summarization and custom essay creation, enabling customizable formats and lengths. Solved challenges in user onboarding, access control, and payment tracking through robust REST APIs and background tasks. Helped users reduce reading and writing time, improve content quality, and streamline research—transforming how individuals and teams manage information and produce written work.",
    image: "/images/quotura.png",
    link: "https://youtu.be/KA4pT3wSKts",
    repository: "https://github.com/Harrylever/Quotura",
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
    name: "TCD Community",
    description:
      "I developed a community platform for developers within my WhatsApp Dev Community. For this project, I created a scalable web application to support the TCD community. Features include user authentication, community forums, project showcases, and resource libraries. Deployed on Vercel, I ensured a responsive design and optimized performance. Ensured interoperability in modern web development, database design, and community-driven product development.",
    link: "https://tcd-main.vercel.app",
    image: "/images/tcd-community.png",
  },
]

export const Projects = () => {
  return (
    <div className="relative">
      <h3 className={clsx(title({ size: "sm" }), "select-none")}>Projects</h3>

      <div className="mt-5 grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </div>
    </div>
  )
}

const ProjectCard = ({ project }: { project: Project }) => {
  const [seeMoreIsActive, setSeeMoreIsActive] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="w-fit group flex items-center gap-2 hover:gap-4 transition-all duration-300">
        <h4
          className={clsx(
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
          <button
            className="mt-3 text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
            type="button"
            onClick={() => setSeeMoreIsActive(false)}
          >
            See less
          </button>
        </motion.div>

        {!seeMoreIsActive && (
          <button
            className="absolute top-1/2 -translate-y-1/2 right-0 w-fit text-sm px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
            type="button"
            onClick={() => setSeeMoreIsActive(true)}
          >
            See more
          </button>
        )}
      </div>
    </div>
  )
}
