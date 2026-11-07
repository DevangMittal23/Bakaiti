import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { MotionProvider } from "@/components/shared/motion-provider";
import { initializeAppearance } from "@/lib/appearance";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bakaiti — Your people. Your frequency.",
    template: "%s | Bakaiti",
  },
  description:
    "The social messenger for your kind of chaos. Catch up with your circle, share a moment, and let your Pulse do the talking.",
  keywords: ["Bakaiti", "social messenger", "chat", "friends", "Pulse"],
  authors: [{ name: "Bakaiti" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Bakaiti",
    title: "Bakaiti — Your people. Your frequency.",
    description: "Conversations, little moments, and your kind of people.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bakaiti",
    description: "Your people. Your frequency.",
  },
};
export const viewport: Viewport = {
  themeColor: "#0d0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        {/* This legacy icon font lives in the shared App Router root layout. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-dvh bg-background font-body text-text-primary antialiased">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(${initializeAppearance.toString()})();`,
          }}
        />
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "var(--bg-surface-container)",
              color: "var(--text-primary)",
              borderColor: "var(--border-default)",
            },
          }}
        />
      </body>
    </html>
  );
}
