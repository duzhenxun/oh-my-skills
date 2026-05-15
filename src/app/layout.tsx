import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Oh My Skills",
  description: "Local AI agent skill manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
