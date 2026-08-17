import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "./ui-overrides.css";

const roboto = Roboto({ subsets: ["latin"], display: "swap", variable: "--font-vsi" });

export const metadata: Metadata = {
  title: "VSI IMS",
  description: "Visionary Students Initiative Information Management System"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={roboto.variable}><body style={{ fontFamily: "var(--font-vsi), sans-serif" }}>{children}</body></html>;
}
