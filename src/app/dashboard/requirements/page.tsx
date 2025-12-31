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
  const [showForm, setShowForm] = useState(false); // Estado para controlar la visibilidad del formulario

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
      {/* Header con botón para mostrar/ocultar formulario */}
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

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={() => router.push("/")}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Volver
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(!showForm)}
              >
                <i
                  className={`bi ${
                    showForm ? "bi-dash-circle" : "bi-plus-circle"
                  } me-2`}
                ></i>
                {showForm ? "Ocultar Formulario" : "Nuevo Requerimiento"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario (condicional) */}
      {showForm && (
        <div className="row mb-4">
          <div className="col-12">
            <RequirementForm
              horizontal
              onSuccess={() => {
                // Opcional: aquí podrías agregar lógica adicional al éxito
                setShowForm(false); // Cerrar el formulario después de enviar
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Lista de requerimientos */}
      <div className="row">
        <div className="col-12">
          <RequirementsList />
        </div>
      </div>
    </div>
  );
}
