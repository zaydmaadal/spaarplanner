import { clsx, type ClassValue } from "clsx";
import type { CSSProperties } from "react";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// Delay step for the `.rise` and `.bar-fill` entrance classes (DESIGN.md Motion): n * 50 ms.
export const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
