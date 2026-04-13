import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ConditionalFooter } from "@/components/ui/ConditionalFooter";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
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
    <html lang="en" className={`${outfit.variable} ${inter.variable} h-full`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-base)] antialiased"
      >
        <ToastProvider>
          {children}
          <ConditionalFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
