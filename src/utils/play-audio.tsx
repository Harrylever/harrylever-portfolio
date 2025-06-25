"use client";

import { PauseIcon, PlayIcon } from "lucide-react";

import { usePlayMusic } from "@/hooks/play-music";

export const PlayAudio = () => {
  const { handlePlay, isPlayed, isPlaying, isEnded, handlePause } =
    usePlayMusic();

  const handleClick = () => {
    if (!isPlaying) {
      handlePlay();
    } else {
      handlePause();
    }
  };

  return isPlayed || isEnded ? null : (
    <button
      className="fixed z-[100] bottom-10 right-10 text-black bg-gray-600 rounded-full p-4"
      onClick={handleClick}
    >
      {isPlaying ? (
        <PauseIcon className="w-4 h-4" />
      ) : (
        <PlayIcon className="w-4 h-4" />
      )}
    </button>
  );
};
