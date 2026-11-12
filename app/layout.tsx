import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVEE AI — Your Intelligence. Without Limits.",
  description: "A new intelligence workspace by EVO.",
  applicationName: "EVEE AI",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/evee-app-icon.png", shortcut: "/evee-app-icon.png", apple: "/evee-app-icon.png" }
};
export const viewport: Viewport = {
  themeColor: "#090b12",
  width: "device-width",
  initialScale: 1
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ClerkProvider>{children}</ClerkProvider></body></html>;
}
