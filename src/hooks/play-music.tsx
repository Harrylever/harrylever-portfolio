"use client";

import { useEffect, useState, useRef } from "react";

const AUDIO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const usePlayMusic = () => {
  const [isPlayed, setIsPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (audioRef.current && isPaused) {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      setIsPlaying(true);
      const audio = new Audio("/audio/In-Noctem.mp3");

      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        setIsEnded(true);
        setIsPlaying(false);
        setIsPaused(false);
        document.cookie = `audioPlayed=true; path=/; max-age=${AUDIO_COOKIE_MAX_AGE}`;
      });

      audio.addEventListener("error", () => {
        setIsPlaying(false);
        setIsPaused(false);
      });

      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handlePause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  useEffect(() => {
    const audioPlayed = document.cookie.includes("audioPlayed=true");

    if (audioPlayed) {
      setIsPlayed(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    isPlayed,
    isPlaying,
    isPaused,
    isEnded,
    handlePlay,
    handlePause,
    handleStop,
  };
};
