import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { TabBar, TabBarView } from "@/components/TabBar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FINN",
  description: "Financial Investment Agent: what changed in your portfolio, what the company says, and who you know who can explain it.",
  appleWebApp: { capable: true, title: "FINN", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <div className="mx-auto min-h-dvh w-full max-w-[480px] pb-[calc(76px+env(safe-area-inset-bottom))]">{children}</div>
        <Suspense fallback={<TabBarView path="" />}>
          <TabBar />
        </Suspense>
      </body>
    </html>
  );
}
