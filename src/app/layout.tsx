import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/common";

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
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const theme = store.get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${theme} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeToggle initialTheme={theme} />
      </body>
    </html>
  );
}