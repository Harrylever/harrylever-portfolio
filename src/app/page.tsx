import { SmoothEntryContainer } from "@/components/smooth-entry-hoc";
import { Hero } from "@/page-sections/app/hero";
import { Projects } from "@/page-sections/app/projects";
import { Skills } from "@/page-sections/app/skills";
import { WorkExperience } from "@/page-sections/app/work-experience";
import { PlayAudio } from "@/utils/play-audio";

export default function Home() {
  return (
    <section className="relative">
      <PlayAudio />
      <div className="relative min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="fixed top-0 left-0 w-full h-screen bg-noise-start bg-contain bg-repeat opacity-30" />

        <SmoothEntryContainer
          className="relative w-full max-w-3xl px-10 sm:px-12 lg:px-0 space-y-16 py-8 md:py-12 duration-300"
          direction="left"
          distance={60}
          duration={0.8}
          staggerDelay={0.2}
        >
          <Hero />
          <WorkExperience />
          <Projects />
          <Skills />
        </SmoothEntryContainer>
      </div>
    </section>
  );
}
