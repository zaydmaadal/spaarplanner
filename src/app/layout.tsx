import type { Metadata } from "next";
import { connection } from "next/server";
import { Figtree, Gabarito } from "next/font/google";
import { ThemeSync } from "@/components/theme-sync";
import { Toaster } from "@/components/ui/sonner";
import { readPrefs } from "@/data/supabase/server";
import "./globals.css";

const gabarito = Gabarito({ variable: "--font-gabarito", subsets: ["latin"], weight: ["600", "700"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Spaarplanner",
  description: "Zie wat je per maand kunt sparen en hoe ver je spaardoelen zijn.",
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Every page renders per request: only then does Next apply the proxy's CSP nonce to its scripts.
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const { palette, theme } = await readPrefs();
  return (
    <html
      lang="nl"
      data-palette={palette}
      data-theme={theme}
      className={`${gabarito.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeSync palette={palette} theme={theme} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
