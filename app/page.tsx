import { Hero } from "@/page-sections/app/hero";
import { Projects } from "@/page-sections/app/projects";
import { Skills } from "@/page-sections/app/skills";
import { WorkExperience } from "@/page-sections/app/work-experience";

export default function Home() {
  return (
    <section className="relative flex flex-col items-center justify-center gap-4">
      <div className="fixed top-0 left-0 w-full h-screen bg-noise-start bg-contain bg-repeat opacity-30" />
      <div className="relative w-full max-w-3xl px-10 sm:px-12 lg:px-0 space-y-16 py-8 md:py-12 duration-300">
        <Hero />
        <WorkExperience />
        <Projects />
        <Skills />
      </div>
    </section>
  );
}
