import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/context/role-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NCPA Time & Attendance",
  description: "Northern California Power Agency - Time & Attendance System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
