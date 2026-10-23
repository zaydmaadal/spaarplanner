import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { readPrefs } from "@/data/supabase/server";
import "./globals.css";

const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Spaarplanner",
  description: "Zie wat je per maand kunt sparen en hoe ver je spaardoelen zijn.",
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// viewport-fit=cover lets the floating nav sit in the safe area; it pads itself with env(safe-area-inset-bottom).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
      className={`${playfair.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
