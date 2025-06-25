"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SmoothEntryProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  className?: string;
}

export const SmoothEntry = ({
  children,
  delay = 0,
  duration = 0.6,
  direction = "up",
  distance = 50,
  className = "",
}: SmoothEntryProps) => {
  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance, opacity: 0 };
      case "down":
        return { y: -distance, opacity: 0 };
      case "left":
        return { x: distance, opacity: 0 };
      case "right":
        return { x: -distance, opacity: 0 };
      default:
        return { y: distance, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case "up":
      case "down":
        return { y: 0, opacity: 1 };
      case "left":
      case "right":
        return { x: 0, opacity: 1 };
      default:
        return { y: 0, opacity: 1 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitialPosition()}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // Custom cubic-bezier for smooth easing
      }}
      viewport={{
        once: true,
        amount: 0.1, // Trigger when 10% of the element is visible
      }}
      whileInView={getAnimatePosition()}
    >
      {children}
    </motion.div>
  );
};

// Alternative version with more advanced stagger support
export const SmoothEntryContainer = ({
  children,
  staggerDelay = 0.1,
  duration = 0.6,
  direction = "up",
  distance = 50,
  className = "",
}: {
  children: ReactNode[];
  staggerDelay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  className?: string;
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { y: distance, opacity: 0 };
      case "down":
        return { y: -distance, opacity: 0 };
      case "left":
        return { x: distance, opacity: 0 };
      case "right":
        return { x: -distance, opacity: 0 };
      default:
        return { y: distance, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case "up":
      case "down":
        return { y: 0, opacity: 1 };
      case "left":
      case "right":
        return { x: 0, opacity: 1 };
      default:
        return { y: 0, opacity: 1 };
    }
  };

  return (
    <div className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={getInitialPosition()}
          transition={{
            duration,
            delay: index * staggerDelay,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          viewport={{
            once: true,
            amount: 0.1,
          }}
          whileInView={getAnimatePosition()}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};
