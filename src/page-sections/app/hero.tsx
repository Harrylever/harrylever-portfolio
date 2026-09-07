import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { RiGithubLine, RiTwitterXLine, RiLinkedinLine } from "react-icons/ri";

import { title } from "@/components/primitives";
import { EncryptButton } from "@/components/encrypt-button";

export const Hero = () => {
  return (
    <div className="w-full flex flex-col md:flex-row items-end md:items-start justify-between gap-10">
      <div className="w-full md:w-[400px] flex flex-col gap-4">
        <div>
          <Image
            alt="Dean Ukanah"
            className="rounded-full hover:scale-105 transition-all duration-300"
            height={150}
            src="/images/deanukanah.jpg"
            width={150}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <h1 className={title({ size: "sm" })}>Dean Ukanah</h1>

          <div className="flex flex-row items-center gap-2 text-gray-500">
            <MapPin className="size-4 text-gray-400" />
            <p className="text-sm">Abuja, Nigeria</p>
          </div>

          <p className="text-sm text-gray-500 text-justify select-none">
            &mdash; A product-driven full-stack engineer. I spend most of my
            time designing and building end-to-end SaaS applications. Passionate
            about frontend and backend systems, API design, and scalable
            architecture, with a rising interest in cybersecurity. Motivated by
            turning ideas into <strong>reliable</strong>,{" "}
            <strong>secure</strong>, and <strong>impactful</strong> products.
          </p>
        </div>

        <div className="flex flex-row items-center gap-5">
          <a
            className="inline-flex items-center justify-center rounded-md border-2 border-white/30 hover:border-white p-2"
            href="https://github.com/harrylever"
            rel="noopener noreferrer"
            target="_blank"
          >
            <RiGithubLine size={20} />
          </a>

          <a
            className="inline-flex items-center justify-center rounded-md border-2 border-white/30 hover:border-white p-2"
            href="https://www.linkedin.com/in/deanukanah/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <RiLinkedinLine size={20} />
          </a>

          <a
            className="inline-flex items-center justify-center rounded-md border-2 border-white/30 hover:border-white p-2"
            href="https://x.com/onesiukanah"
            rel="noopener noreferrer"
            target="_blank"
          >
            <RiTwitterXLine size={20} />
          </a>

          <a
            className="inline-flex items-center justify-center rounded-md border-2 border-white/30 hover:border-white p-2"
            href="tel:+2348166114977"
          >
            <Phone size={20} />
          </a>

          <a
            className="inline-flex items-center justify-center rounded-md border-2 border-white/30 hover:border-white p-2"
            href="mailto:devdean315user@gmail.com"
          >
            <Mail size={20} />
          </a>
        </div>
      </div>
      <EncryptButton />
    </div>
  );
};
