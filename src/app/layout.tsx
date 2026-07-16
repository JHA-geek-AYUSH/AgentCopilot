import type { Metadata } from "next";
import { Poppins, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentOS — Personal Agent OS",
  description: "Your AI-powered personal agent that executes tasks across apps with persistent memory.",
  keywords: ["agent", "AI", "automation", "personal assistant", "memory"],
  authors: [{ name: "AgentOS" }],
  openGraph: {
    title: "AgentOS — Personal Agent OS",
    description: "Your AI-powered personal agent that executes tasks across apps with persistent memory.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
        <body className="min-h-screen antialiased bg-[#08090a] text-foreground" suppressHydrationWarning={true}>
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}

