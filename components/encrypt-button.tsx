"use client";

import { forwardRef, useRef, useState } from "react";
import { useButton } from "@heroui/react";
import { motion } from "framer-motion";
import { FileDown } from "lucide-react";

const TARGET_TEXT = "Download Resume";
const CYCLES_PER_LETTER = 2;
const SHUFFLE_TIME = 100;

const CHARS = "!@#$%^&*():{};|,.<>/?";

export const EncryptButton = forwardRef((props, ref) => {
  const { domRef, getButtonProps } = useButton({
    ref: ref as React.RefObject<HTMLButtonElement>,
    color: "primary",
    radius: "none",
    className: "w-fit md:mt-10",
    ...props,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [text, setText] = useState(TARGET_TEXT);

  const scramble = () => {
    let pos = 0;

    intervalRef.current = setInterval(() => {
      const scrambled = TARGET_TEXT.split("")
        .map((char, index) => {
          if (pos / CYCLES_PER_LETTER > index) {
            return char;
          }

          const randomCharIndex = Math.floor(Math.random() * CHARS.length);
          const randomChar = CHARS[randomCharIndex];

          return randomChar;
        })
        .join("");

      setText(scrambled);
      pos++;

      if (pos >= TARGET_TEXT.length * CYCLES_PER_LETTER) {
        stopScramble();
      }
    }, SHUFFLE_TIME);
  };

  const stopScramble = () => {
    clearInterval(intervalRef.current || undefined);

    setText(TARGET_TEXT);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onAnimationStart, onDragStart, onDragEnd, onDrag, ...buttonProps } =
    getButtonProps({});

  return (
    <motion.button
      ref={domRef as React.RefObject<HTMLButtonElement>}
      {...buttonProps}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.975 }}
      onMouseEnter={scramble}
      onMouseLeave={stopScramble}
    >
      <div className="relative z-10 flex items-center gap-2">
        <FileDown size={16} />
        <span>{text}</span>
      </div>

      {/* <motion.span
        animate={{
          y: "-100%",
        }}
        className="duration-300 absolute inset-0 z-0 scale-125 bg-gradient-to-t from-indigo-400/0 from-40% via-white/50 to-indigo-400/20 to-60% opacity-0 transition-opacity group-hover:opacity-100"
        initial={{
          y: "100%",
        }}
        transition={{
          repeat: Infinity,
          repeatType: "mirror",
          duration: 1,
          ease: "linear",
        }}
      /> */}
    </motion.button>
  );
});

EncryptButton.displayName = "EncryptButton";
