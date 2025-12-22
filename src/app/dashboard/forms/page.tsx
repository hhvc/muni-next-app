// src/app/dashboard/forms/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import FormsGrid from "@/components/forms/FormsGrid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function FormsPage() {
  const { user, userRoles } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const allowedRoles = ["admin", "hr", "root", "data", "collaborator"];
  const hasAccess = userRoles?.some((role) => allowedRoles.includes(role));

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  if (!hasAccess) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">Acceso denegado</h4>
          <p>No tienes permisos para acceder a esta sección.</p>
          <button
            className="btn btn-outline-danger"
            onClick={() => router.push("/")}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ================= HEADER (centrado) ================= */}
      <div className="container-xxl py-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h2 fw-bold dashboard-title">Formularios</h1>
            <p className="dashboard-subtitle mb-0">
              Gestiona y accede a todos los formularios disponibles
            </p>
          </div>

          <button
            className="btn btn-outline-secondary"
            onClick={() => router.push("/")}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Volver
          </button>
        </div>
      </div>

      {/* ================= GRID (FULL WIDTH REAL) ================= */}
      <div className="px-3 px-md-4 px-xxl-5">
        <FormsGrid />
      </div>
    </>
  );
}
