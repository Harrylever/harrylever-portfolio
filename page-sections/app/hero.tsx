import Image from "next/image";
import { Button } from "@heroui/button";
import { RiGithubLine, RiTwitterXLine, RiLinkedinLine } from "react-icons/ri";

import { title } from "@/components/primitives";
import { EncryptButton } from "@/components/encrypt-button";

// const skills = ["Python", "React", "Next.js", "React-Native", "NestJS"];

export const Hero = () => {
  return (
    <div className="w-full flex flex-col md:flex-row items-end md:items-start justify-between gap-10">
      <div className="w-full md:w-[400px] flex flex-col gap-4">
        <div>
          <Image
            alt="Harrylever"
            className="rounded-full"
            height={120}
            src="/images/harrylever.png"
            width={120}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className={title({ size: "sm" })}>Harrylever</h1>
          <p className="text-sm text-gray-500 text-justify">
            Fullstack Web & Mobile Developer/Engineer with a passion for shiny,
            neo-classical digital experiences. I craft sleek, professional web
            and mobile solutions that blend modern usability with timeless
            aesthetics. Explore my projects and see how I create elegant user
            interfaces for complex applications.
          </p>
        </div>

        {/* <div className="flex flex-row items-center gap-4">
          {skills.map((skill) => (
            <Chip key={skill} size="sm" variant="solid">
              <span className="font-semibold">{skill}</span>
            </Chip>
          ))}
        </div> */}

        <div className="flex flex-row items-center gap-5">
          <Button
            isIconOnly
            as="a"
            className="border-2 border-white/30 hover:border-white"
            color="primary"
            href="https://github.com/harrylever"
            radius="md"
            variant="flat"
          >
            <RiGithubLine size={20} />
          </Button>

          <Button
            isIconOnly
            as="a"
            className="border-2 border-white/30 hover:border-white"
            color="primary"
            href="https://www.linkedin.com/in/deanukanah/"
            radius="md"
            variant="flat"
          >
            <RiLinkedinLine size={20} />
          </Button>

          <Button
            isIconOnly
            as="a"
            className="border-2 border-white/30 hover:border-white"
            color="primary"
            href="https://x.com/onesiukanah"
            radius="md"
            variant="flat"
          >
            <RiTwitterXLine size={20} />
          </Button>
        </div>
      </div>
      <EncryptButton />
    </div>
  );
};
