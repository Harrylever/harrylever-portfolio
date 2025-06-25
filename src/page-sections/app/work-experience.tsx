import { Chip } from "@heroui/chip";
import { cn } from "@heroui/theme";

import { subtitle, title } from "@/components/primitives";
import { prettyDate } from "@/utils/pretty-date";
import { WorkExperience as WorkExperienceType } from "@/types";

const workExperiences: WorkExperienceType[] = [
  {
    company: "Clique",
    title: "Full-Stack Software Engineer",
    description:
      "Develop and maintain web applications using Typescript, React, Vite, Material UI, NestJS, and PostgreSQL.",
    startDate: "2024-07-01T11:00:00.000Z",
    isPresent: true,
  },
  {
    company: "Provarex Innovations",
    title: "Engineering Lead",
    description:
      "Led a team of engineers to develop and maintain web applications using React, Next.js, and Tailwind CSS.",
    startDate: "2024-05-01T11:00:00.000Z",
    endDate: "2024-08-31T23:00:00.000Z",
  },
  {
    company: "Jejelove Solutions",
    title: "Full-Stack Engineer",
    description:
      "Developed and maintained web applications using React, Next.js, and Tailwind CSS.",
    isRemote: true,
    startDate: "2023-03-31T23:00:00.000Z",
    endDate: "2023-07-31T23:00:00.000Z",
  },
  {
    company: "Stanrute Technologies",
    title: "Backend Engineer",
    description:
      "Developed and maintained backend web applications using Node.js, Express, NestJS and MongoDB.",
    isRemote: true,
    startDate: "2022-11-01T00:00:00.000Z",
    endDate: "2023-02-01T00:00:00.000Z",
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
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between">
              <h3 className={subtitle()}>{workExperience.company}</h3>

              <div>
                <Chip size="sm" variant="bordered">
                  <span className="text-sm text-white/80 select-none">
                    {prettyDate(workExperience.startDate)} -{" "}
                    {workExperience.isPresent
                      ? "Present"
                      : prettyDate(workExperience?.endDate ?? "")}
                  </span>
                </Chip>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3 md:mt-0">
              {workExperience.title}
            </p>
            <p className="text-sm text-gray-500">
              {workExperience.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
