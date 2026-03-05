import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppToaster } from "@/components/ui/app-toaster";

import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AionChat",
  description: "AionChat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geist.className} min-h-dvh bg-background text-foreground antialiased`}
      >
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
