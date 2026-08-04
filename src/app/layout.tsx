import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WITHIN Cohort Log",
  description: "Daily capture log for WITHIN cohort members.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "WITHIN",
    statusBarStyle: "black-translucent",
  },
  // Next's `appleWebApp.capable` only emits the modern
  // `mobile-web-app-capable` tag. iOS Safari's home-screen install still
  // keys off the Apple-prefixed name, so it is added explicitly here.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // `black-translucent` (above) only pushes web content under the iOS status
  // bar when the viewport also opts into the safe-area insets. Without this the
  // web view stays inset below the bar and that strip paints the light <body>
  // background, showing as a white bar on the home-screen app.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
