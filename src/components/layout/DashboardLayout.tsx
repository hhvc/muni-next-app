"use client";

import { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();

  // Si no hay usuario (por seguridad extra)
  if (!user) {
    return (
      <div className="container-fluid py-5 text-center">
        <h4 className="dashboard-title">Acceso restringido</h4>
        <p className="dashboard-subtitle text-muted">
          Debe iniciar sesión para acceder a este panel.
        </p>
      </div>
    );
  }

  return (
    <section className="container-fluid pb-5">
      <div className="card shadow-sm border-0 p-4">{children}</div>
    </section>
  );
}
