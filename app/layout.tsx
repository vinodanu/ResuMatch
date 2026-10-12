import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResuMatch — Resume & JD Analyzer",
  description: "Compare your resume to a job description with transparent keyword scoring and clear templates.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
