// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 💡 Elimina estas líneas:
  // output: "export",
  // distDir: "out",
  trailingSlash: true,
  images: {
    unoptimized: true, // Puedes revisar esto después si necesitas optimización de imágenes con App Hosting y Cloud Storage/Functions
  },
  // Añade estas configuraciones para Firebase
  // basePath y assetPrefix generalmente no son necesarios para App Hosting con la configuración por defecto
  // basePath: process.env.NODE_ENV === "production" ? "" : "",
  // assetPrefix: process.env.NODE_ENV === "production" ? "/" : "/",
  // Opcional: Configuración para PWA (esto es independiente de App Hosting)
  // pwa: {
  //   dest: "public",
  //   disable: process.env.NODE_ENV === "development",
  // },
};

export default nextConfig;
