// Root layout wrapping every App Router route.
// (EN: Root layout that wraps every App Router route.)
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tus.io Resumable Upload",
  description: "Lab: resumable upload via tus protocol + HeroUI v3 progress UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
