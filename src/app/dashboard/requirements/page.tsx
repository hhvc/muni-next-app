// src/app/dashboard/requirements/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import RequirementForm from "@/components/requirements/RequirementForm";
import RequirementsList from "@/components/requirements/RequirementsList";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RequirementsPage() {
  const { user, userRoles } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isAdmin = userRoles?.some((role) =>
    ["admin", "root", "data"].includes(role)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isCheckingAuth && !user) {
      router.push("/");
    }
  }, [user, isCheckingAuth, router]);

  if (isCheckingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container-xxl py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <h1 className="h2 fw-bold dashboard-title">
                Requerimientos de Datos
              </h1>
              <p className="dashboard-subtitle mb-0">
                {isAdmin
                  ? "Gestiona todos los requerimientos del área de datos"
                  : "Solicita nuevos reportes, análisis o formularios al área de datos"}
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
      </div>

      {/* Formulario */}
      <div className="row mb-4">
        <div className="col-12">
          <RequirementForm horizontal />
        </div>
      </div>

      {/* Lista */}
      <div className="row">
        <div className="col-12">
          <RequirementsList />
        </div>
      </div>
    </div>
  );
}
