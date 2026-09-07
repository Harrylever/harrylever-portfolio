import clsx from "clsx";
import Link from "next/link";

import { title } from "@/components/primitives";

export const ContactMe = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center gap-2">
      <h3
        className={clsx(
          title({ fullWidth: false, size: "sm" }),
          "select-none text-center",
        )}
      >
        Let&apos;s Connect
      </h3>
      <p className="text-sm text-gray-400 text-justify sm:text-center max-w-2xl">
        I&apos;m always open to discussing new opportunities, exciting projects,
        and meaningful collaborations. Whether you&apos;re looking to build
        something innovative, solve challenging problems, or simply want to
        connect, I&apos;d love to hear from you. Let&apos;s explore how we can
        work together.
      </p>

      <Link
        className="text-sm text-gray-400 text-center font-medium hover:text-gray-300 transition-colors mt-2 border border-white/30 rounded-md px-4 py-2 hover:bg-white/10"
        href="https://wa.link/hemaxw"
        target="_blank"
      >
        Get in Touch
      </Link>
    </div>
  );
};
