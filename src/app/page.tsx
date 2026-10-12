import { Fragment } from "react";
import { notFound } from "next/navigation";

import { PersonalNav } from "@/page-sections/personal/personal-nav";
import { Intro } from "@/page-sections/personal/intro";
import { Now } from "@/page-sections/personal/now";
import { Built } from "@/page-sections/personal/built";
import { Commits } from "@/page-sections/personal/commits";
import { Frames, Reach } from "@/page-sections/personal/frames";
import { Loop } from "@/page-sections/personal/loop";
import { Say } from "@/page-sections/personal/say";
import {
  getPublishedHomepage,
  getPublishedSiteProfile,
  type PublicHomepage,
  type PublicSiteProfile,
} from "@/server/content/public";

function renderSection(
  type: PublicHomepage["sections"][number]["type"],
  homepage: PublicHomepage,
  profile: PublicSiteProfile,
) {
  switch (type) {
    case "intro":
      return <Intro profile={profile} section={homepage.intro} />;
    case "now":
      return <Now section={homepage.now} />;
    case "built":
      return <Built section={homepage.built} />;
    case "commits":
      return <Commits section={homepage.commits} />;
    case "frames":
      return <Frames section={homepage.frames} />;
    case "reach":
      return <Reach section={homepage.reach} />;
    case "loop":
      return <Loop section={homepage.loop} />;
    case "say":
      return <Say profile={profile} section={homepage.say} />;
  }
}

export default async function Home() {
  const [profile, homepage] = await Promise.all([
    getPublishedSiteProfile(),
    getPublishedHomepage(),
  ]);

  if (!profile || !homepage) notFound();

  return (
    <>
      <a className="skip" href="#top">
        Skip to content
      </a>
      <PersonalNav sections={homepage.sections} socials={profile.socialLinks} />
      {homepage.sections.map(({ type, visible }) =>
        visible ? (
          <Fragment key={type}>
            {renderSection(type, homepage, profile)}
          </Fragment>
        ) : null,
      )}
    </>
  );
}
