// next.config.ts - VERSIÓN FINAL PARA DEPLOY
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,

  // Configuración de imágenes optimizada
  images: {
    // Configuración base
    unoptimized: process.env.NODE_ENV === "production" ? false : true,

    // Dominios permitidos en producción
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lookerstudio.google.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "**.googleapis.com",
      },
    ],

    // Tamaños de imagen
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // En desarrollo, permitir cualquier dominio
    ...(process.env.NODE_ENV === "development" && {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**",
        },
      ],
    }),
  },

  // Configuración obligatoria para Firebase App Hosting
  output: "standalone",

  // Configuración experimental optimizada
  experimental: {
    optimizePackageImports: ["firebase", "firebase-admin", "react-bootstrap"],
  },

  // Configuración de encabezados de seguridad
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },

  // Configuración para TypeScript y ESLint
  typescript: {
    ignoreBuildErrors: false,
  },

  poweredByHeader: false,

  // Elimina swcMinify - Ya no es necesario en Next.js 15
};

export default nextConfig;
