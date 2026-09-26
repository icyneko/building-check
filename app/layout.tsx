import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Rounds — Room checklists",
  description: "Configure your rooms, work through checklists, and keep every detail in check.",
  other: {
    "codex-preview": "development",
  },
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
