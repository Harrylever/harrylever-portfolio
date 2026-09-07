import { PersonalNav } from "@/page-sections/personal/personal-nav";
import { Intro } from "@/page-sections/personal/intro";
import { Now } from "@/page-sections/personal/now";
import { Built } from "@/page-sections/personal/built";
import { Commits } from "@/page-sections/personal/commits";
import { Frames, Reach } from "@/page-sections/personal/frames";
import { Loop } from "@/page-sections/personal/loop";
import { Say } from "@/page-sections/personal/say";
import { ScrollRefresh } from "@/page-sections/personal/scroll-refresh";

export default function Home() {
  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <ScrollRefresh />
      <PersonalNav />
      <Intro />
      <Now />
      <Built />
      <Commits />
      <Frames />
      <Reach />
      <Loop />
      <Say />
    </>
  );
}
