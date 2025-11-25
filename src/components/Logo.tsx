// src/components/Logo.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Logo() {
  const { user, userRole } = useAuth();
  if (!user) {
    return null;
  }

  if (userRole === "nuevo" || userRole === "pending_verification") {
    return null;
  }

  return (
    <Link href="/" className="text-decoration-none">
      <Image
        src="/Logos-Faltas07.png"
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
