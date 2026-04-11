import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const syne = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NIAT CBC — Community Building Championship",
  description:
    "NIAT Community Building Championship — complete challenges, earn points, climb the leaderboard.",
  icons: { icon: "/icon.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} h-full`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-base)] antialiased"
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
