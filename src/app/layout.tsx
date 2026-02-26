import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/context/role-context";

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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
