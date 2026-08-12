import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "VSI IMS", description: "Visionary Students Initiative Information Management System" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
