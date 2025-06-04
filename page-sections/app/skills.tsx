import { cn } from "@heroui/theme";

import { title } from "@/components/primitives";

const skills: string[] = [
  "React",
  "Next.JS",
  "React-Native",
  "Tailwind",
  "Shadcn",
  "Typescript",
  "NestJS",
  "Python",
  "FastAPI",
  "PostgreSQL",
  "Docker",
  "Git",
  "CI/CD",
  "GitLabCI",
  "AWS",
  "GCP",
  "Azure",
  "Jenkins",
  "CircleCI",
  "GitHubActions",
  "BitbucketPipelines",
];

export const Skills = () => {
  return (
    <div>
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
