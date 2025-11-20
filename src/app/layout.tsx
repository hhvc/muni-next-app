// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { AuthProvider } from "@/components/AuthProvider";
import { AuthRouter } from "@/components/AuthRouter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Muni App",
  description: "App privada para servicios Muni",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AuthRouter>{children}</AuthRouter>
        </AuthProvider>
      </body>
    </html>
  );
}
