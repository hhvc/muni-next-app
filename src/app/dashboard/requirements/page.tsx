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

  if (!user) {
    return null;
  }

  return (
    <div className="container-fluid py-4 text-white">
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 fw-bold">Requerimientos de Datos</h1>
              <p className="mb-0">
                {isAdmin
                  ? "Gestiona todos los requerimientos del área de datos"
                  : "Solicita nuevos reportes, análisis o formularios al área de datos"}
              </p>
            </div>
            <div>
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
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <RequirementsList />
        </div>
        <div className="col-lg-4 mb-4">
          <RequirementForm />

          {isAdmin && (
            <div className="card mt-4 shadow-sm">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">Estadísticas</h6>
              </div>
              <div className="card-body">
                <p className="card-text small">
                  <i className="bi bi-info-circle me-2"></i>
                  Aquí podrás ver métricas de los requerimientos (pendiente de
                  desarrollo).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
