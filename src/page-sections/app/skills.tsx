import { cn } from "@heroui/theme";

import { title } from "@/components/primitives";

const skills: string[] = [
  "React",
  "Next.js",
  "React Native",
  "Expo",
  "Material UI",
  "Tailwind CSS",
  "Vite",
  "Remix.run",
  "Shadcn UI",
  "Javascript",
  "Typescript",
  "Node.js",
  "NestJS",
  "Express",
  "Python",
  "FastAPI",
  "GraphQL",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "Git",
  "CI/CD",
  "AWS",
  "GCP",
  "Azure",
  "CircleCI",
  "GitHubActions",
  "Supabase",
  "Hygraph CMS",
  "Firebase",
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
