import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Agent Immune System | Security for AI Agents",
  description: "Protect your AI agents from prompt injection, secret leaks, and runaway spending. One proxy, instant protection, shared threat intelligence.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Agent Immune System",
    description: "Security infrastructure for AI agents. Prompt injection defense, secret redaction, budget controls.",
    type: "website",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950`}>
        {children}
      </body>
    </html>
  );
}
