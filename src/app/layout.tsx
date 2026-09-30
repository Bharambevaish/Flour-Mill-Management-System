import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Plus_Jakarta_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/common";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "गिरणी व्यवस्थापन | Flour Mill Management",
  description: "Feed mill order, payment and outstanding management — आपल्या मालाची स्थिती तपासा",

  /**
   * The manifest itself lives in `app/manifest.ts`; adding a `manifest` field
   * here would be ignored, because the file convention always takes precedence.
   *
   * These are the icons the BROWSER chrome uses (favicon / tab, and the iOS
   * home screen), pointing at the same generated files the manifest declares so
   * there is a single source of truth for the brand mark. `app/favicon.ico` was
   * removed — it was Next.js's stock logo, so customers saw the Next.js logo in
   * their tab.
   */
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },

  /**
   * Makes iOS Safari's "Add to Home Screen" produce a real app: its own icon,
   * the given title, no browser chrome. `capable` is the legacy spelling the
   * current types still expect (not `capabilities`).
   */
  appleWebApp: {
    capable: true,
    title: "Girani",
    statusBarStyle: "default",
  },
};

/**
 * The customer portal is used almost entirely on phones, so the mobile viewport
 * is set explicitly instead of relying on the framework default: it also tints
 * the Android/iOS browser chrome to match the app surface.
 *
 * `maximumScale`/`user-scalable` are deliberately NOT set — blocking pinch-zoom
 * is an accessibility failure, and this audience is exactly the one that needs
 * to be able to zoom in.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const theme = store.get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${geistSans.variable} ${geistMono.variable} ${theme} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeToggle initialTheme={theme} />
      </body>
    </html>
  );
}