"use client";

import { useEffect, useState } from "react";

const AUDIO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const PlayAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    const audio = new Audio("/audio/In-Noctem.mp3");

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      document.cookie = `audioPlayed=true; path=/; max-age=${AUDIO_COOKIE_MAX_AGE}`;
    });

    audio.addEventListener("error", () => {
      setIsPlaying(false);
    });

    audio.play().catch(() => {
      setIsPlaying(false);
    });
  };

  useEffect(() => {
    const handleDocumentClick = () => {
      const audioPlayed = document.cookie.includes("audioPlayed=true");

      if (isPlaying || audioPlayed) return;
      handlePlay();
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isPlaying]);

  return null;
};
