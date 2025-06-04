import { Chip } from "@heroui/chip";
import { cn } from "@heroui/theme";

import { subtitle, title } from "@/components/primitives";
import { prettyDate } from "@/utils/pretty-date";
import { WorkExperience as WorkExperienceType } from "@/types";

const workExperiences: WorkExperienceType[] = [
  {
    company: "Clique",
    title: "Full-Stack Engineer",
    description:
      "Developed and maintained web applications using React, Next.js, and Tailwind CSS.",
    startDate: "2025-04-07T23:01:39.000Z",
    isPresent: true,
  },
  {
    company: "Provarex Innovations",
    title: "Engineering Lead",
    description:
      "Led a team of engineers to develop and maintain web applications using React, Next.js, and Tailwind CSS.",
    startDate: "2025-04-07T23:01:39.000Z",
    endDate: "2025-04-07T23:01:39.000Z",
  },
  {
    company: "Jejelove Solutions",
    title: "Full-Stack Engineer",
    description:
      "Developed and maintained web applications using React, Next.js, and Tailwind CSS.",
    isRemote: true,
    startDate: "2024-01-01T23:01:39.000Z",
    endDate: "2024-01-01T23:01:39.000Z",
  },
  {
    company: "Stanrute Technologies",
    title: "Backend Engineer",
    description:
      "Developed and maintained web applications using React, Next.js, and Tailwind CSS.",
    isRemote: true,
    startDate: "2024-01-01T23:01:39.000Z",
    endDate: "2024-01-01T23:01:39.000Z",
  },
];

export const WorkExperience = () => {
  return (
    <div className="grid w-full">
      <h3 className={cn(title({ size: "sm" }), "select-none")}>
        Work Experience
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-6">
        {workExperiences.map((workExperience) => (
          <div key={workExperience.company} className="flex flex-col w-full">
            <div className="w-full flex items-center justify-between">
              <h3 className={subtitle()}>{workExperience.company}</h3>

              <div>
                <Chip size="sm" variant="bordered">
                  <span className="text-sm text-white/80">
                    {prettyDate(workExperience.startDate)} -{" "}
                    {workExperience.isPresent
                      ? "Present"
                      : prettyDate(workExperience?.endDate ?? "")}
                  </span>
                </Chip>
              </div>
            </div>
            <p className="text-sm text-gray-500">{workExperience.title}</p>
            <p className="text-sm text-gray-500">
              {workExperience.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
