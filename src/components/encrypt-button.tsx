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

  const handleClick = () => {
    window.open(process.env.NEXT_PUBLIC_RESUME_URL, "_blank");
  };

  return (
    <motion.button
      ref={domRef as React.RefObject<HTMLButtonElement>}
      {...buttonProps}
      whileHover={{ scale: 1 }}
      whileTap={{ scale: 0.975 }}
      onClick={handleClick}
      onMouseEnter={scramble}
      onMouseLeave={stopScramble}
    >
      <div className="relative z-10 flex items-center gap-2">
        <FileDown size={16} />
        <span>{text}</span>
      </div>
    </motion.button>
  );
});

EncryptButton.displayName = "EncryptButton";
