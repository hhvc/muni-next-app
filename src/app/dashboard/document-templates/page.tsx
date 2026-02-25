/* src/app/dashboard/document-templates/page.tsx - CON MANEJO DE ERRORES */
"use client";

import { useAuth } from "@/components/AuthProvider";
import Unauthorized from "@/components/Unauthorized";
import TemplateManager from "@/components/document-templates/TemplateManager";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function TemplatesPage() {
  const { user, userRoles, loadingUserStatus, hasError, errorDetails } =
    useAuth();

  if (loadingUserStatus) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-3 text-muted">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">Error de autenticación</h4>
          <p>{errorDetails || "Hubo un problema al verificar tus permisos."}</p>
          <hr />
          <p className="mb-0">
            Por favor, recarga la página o contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  // Verificar permisos para acceder al repositorio
  const canAccessTemplates = userRoles?.some((role) =>
    ["admin", "hr", "root", "data", "collaborator"].includes(role)
  );

  if (!user || !canAccessTemplates) {
    return <Unauthorized />;
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h2 fw-bold">
            <i className="bi bi-folder2-open text-info me-3"></i>
            Repositorio de Plantillas
          </h1>
          <p className="text-muted mb-0">
            Accede y gestiona todas las plantillas.
          </p>
        </div>
      </div>

      <TemplateManager />
    </div>
  );
}
