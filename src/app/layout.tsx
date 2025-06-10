// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Ejemplo de fuente, puedes quitar si no la usas
// Asegúrate de que la ruta a tu archivo CSS global sea correcta
import "./globals.css";
// Importa Bootstrap CSS aquí. Asegúrate de haberlo instalado con npm.
import "bootstrap/dist/css/bootstrap.min.css";

import { AuthProvider } from "@/components/AuthProvider"; // Importa tu AuthProvider

const inter = Inter({ subsets: ["latin"] }); // Ejemplo de fuente

export const metadata: Metadata = {
  title: "Muni App", // Cambia esto al título de tu app
  description: "App privada para servicios Muni", // Cambia la descripción
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {" "}
        {/* O remueve className si no usas la fuente */}
        {/* Envuelve el contenido de la aplicación con el AuthProvider */}
        {/* AuthProvider es un Client Component, pero puede envolver Server Components */}
        <AuthProvider>
          {children} {/* children será tu página actual (ej: app/page.tsx) */}
        </AuthProvider>
      </body>
    </html>
  );
}
