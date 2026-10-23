import { ViewTransition } from "react";

// A template remounts on every navigation, so the page gets an enter and an exit (classes in globals.css).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
