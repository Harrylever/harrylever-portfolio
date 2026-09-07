"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { SmoothScroll } from "./smooth-scroll";

import { CustomCursor } from "@/components/design-system/custom-cursor";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  return (
    <NextThemesProvider {...themeProps}>
      <CustomCursor />
      <SmoothScroll>{children}</SmoothScroll>
    </NextThemesProvider>
  );
}
