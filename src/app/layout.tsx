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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/Ico-Faltas.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/Ico-Faltas.ico" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AuthRouter>{children}</AuthRouter>
        </AuthProvider>
      </body>
    </html>
  );
}
