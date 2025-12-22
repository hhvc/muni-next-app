// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

import { AuthProvider } from "@/components/AuthProvider";
import { AuthRouter } from "@/components/AuthRouter";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Muni App",
  description: "App privada para servicios Muni",
  icons: {
    icon: [
      {
        url: "/Ico-Faltas.ico",
        type: "image/x-icon",
      },
    ],
    apple: [
      {
        url: "/Ico-Faltas.ico",
        type: "image/x-icon",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/Ico-Faltas.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/Ico-Faltas.ico" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <div className="container-fluid py-3">
            <div className="row align-items-center">
              <div className="col-12 col-md-7 col-lg-8 mb-3 mb-md-0">
                <div className="d-flex justify-content-center justify-content-md-start">
                  <Logo />
                </div>
              </div>

              <div className="col-12 col-md-5 col-lg-4">
                <div className="d-flex flex-column align-items-center align-items-md-end gap-2">
                  <UserProfile />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>

          <main>
            <AuthRouter>{children}</AuthRouter>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
