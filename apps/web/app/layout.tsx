import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthStoreHydration } from "@/components/auth/AuthStoreHydration";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_DISPLAY_NAME,
  description: "Candidate screening and job applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthStoreHydration />
        {children}
      </body>
    </html>
  );
}
