import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reframe — AI image-to-editable design editor",
  description: "Turn any raster image into an editable design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
