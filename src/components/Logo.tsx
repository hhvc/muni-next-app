// src/components/Logo.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Logo() {
  const { user, userRole } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const currentTheme =
      (document.documentElement.getAttribute("data-theme") as
        | "dark"
        | "light") || "dark";

    setTheme(currentTheme);

    // Por si el tema cambia en runtime
    const observer = new MutationObserver(() => {
      const updatedTheme =
        (document.documentElement.getAttribute("data-theme") as
          | "dark"
          | "light") || "dark";
      setTheme(updatedTheme);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  if (!user) return null;
  if (userRole === "nuevo" || userRole === "pending_verification") return null;

  const logoSrc =
    theme === "light"
      ? "/LogoTFaltasNegro2Transparente.png"
      : "/LogoTFaltasBlancoTransparente.png";

  return (
    <Link href="/" className="text-decoration-none">
      <Image
        src={logoSrc}
        alt="Logo Muni App"
        width={400}
        height={80}
        className="logo"
        priority
        style={{
          width: "400px",
          height: "auto",
          maxWidth: "100%",
        }}
      />
    </Link>
  );
}
