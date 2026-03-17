// src/components/dashboards/CentralDashboard.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import DashboardCard from "@/components/dashboards/DashboardCard";

export default function CentralDashboard() {
  const router = useRouter();
  const { userRole } = useAuth();

  // Determinar la ruta del dashboard específico según el rol
  const getDashboardRoute = (role: string | null) => {
    switch (role) {
      case "admin":
        return "/dashboard/admin";
      case "hr":
        return "/dashboard/hr";
      case "collaborator":
        return "/dashboard/collaborator";
      case "data":
        return "/dashboard/data";
      case "guardiaurbana":
        return "/dashboard/guardiaurbana";
      case "promotoresconvivencia":
        return "/dashboard/promotoresconvivencia";
      default:
        return "/dashboard/root";
    }
  };

  const specificDashboardRoute = getDashboardRoute(userRole);

  // Verificar si el usuario tiene permisos de administración
  const hasAdminAccess = ["admin", "root", "data"].includes(userRole || "");

  // Verificar permisos para plantillas (mismos permisos que documentos)
  const hasTemplateAccess = ["admin", "hr", "root", "data"].includes(
    userRole || "",
  );

  const hasGuardiaUrbanaAccess = [
    "root",
    "admin",
    "hr",
    "data",
    "guardiaurbana",
  ].includes(userRole || "");

  const hasPromotoresAccess = [
    "root",
    "admin",
    "hr",
    "data",
    "promotoresconvivencia",
  ].includes(userRole || "");

  return (
    <div className="min-vh-100 py-4 central-dashboard">
      {/* Contenido principal */}
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <h1 className="display-4 fw-bold text-center dashboard-title mb-2">
              Ciencia de Datos y Comportamiento
            </h1>
            <p className="text-center dashboard-subtitle lead">
              Plataforma centralizada para la gestión de datos y comportamiento
              organizacional
            </p>
          </div>
        </div>

        {/* Sección de aplicativos */}
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="row">
              <div className="col-12 mb-4 text-center">
                <h2 className="fw-bold dashboard-section-title mb-3">
                  Aplicativos del Área
                </h2>
                <p
                  className="dashboard-section-subtitle mx-auto"
                  style={{ maxWidth: "600px" }}
                >
                  Accede a las herramientas y sistemas disponibles según tu rol
                  y permisos asignados
                </p>
              </div>

              {/* Tarjeta 1: Requerimientos de Datos */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="📨"
                  iconVariant="purple"
                  title="Requerimientos de Datos"
                  description="Solicita nuevos reportes, análisis o modificaciones al área de Datos"
                  action={
                    <button
                      className="btn btn-outline-purple btn-sm"
                      onClick={() => router.push("/dashboard/requirements")}
                    >
                      Acceder
                    </button>
                  }
                />
              </div>

              {/* Tarjeta 2: Promotores de Convivencia */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="bi-people"
                  iconVariant="warning"
                  title="Promotores de Convivencia"
                  description="Panel de gestión y seguimiento para promotores de convivencia"
                  action={
                    hasPromotoresAccess ? (
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() =>
                          router.push("/dashboard/promotoresconvivencia")
                        }
                      >
                        Acceder
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled
                        title="No tienes permisos para acceder a este dashboard"
                      >
                        No disponible
                      </button>
                    )
                  }
                />
              </div>

              {/* Tarjeta 3: Dashboard Guardia Urbana */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="🚓"
                  iconVariant="red"
                  title="Guardia Urbana"
                  description="Panel de gestión y análisis específico para la Guardia Urbana"
                  action={
                    hasGuardiaUrbanaAccess ? (
                      <button
                        className="btn btn-outline-red btn-sm"
                        onClick={() => router.push("/dashboard/guardiaurbana")}
                      >
                        Acceder
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled
                        title="No tienes permisos para acceder a este dashboard"
                      >
                        No disponible
                      </button>
                    )
                  }
                />
              </div>

              {/* Tarjeta 4: Tableros de Datos */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="📊"
                  iconVariant="primary"
                  title="Tableros de Datos"
                  description="Reportes dinámicos e interactivos con visualización de métricas."
                  action={
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => router.push("/dashboard/looker")}
                    >
                      Acceder
                    </button>
                  }
                />
              </div>

              {/* Tarjeta 5: Formularios */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="📋"
                  iconVariant="info"
                  title="Formularios"
                  description="Formularios en uso para la recolección de datos."
                  action={
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={() => router.push("/dashboard/forms")}
                    >
                      Acceder
                    </button>
                  }
                />
              </div>

              {/* Tarjeta 6: Sistemas de Gestión (Inactivo por ahora) */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="🔧"
                  iconVariant="success"
                  title="Sistemas de Gestión"
                  description="Aplicativos integrados a medida."
                  action={
                    <button
                      className="btn btn-outline-success btn-sm"
                      disabled
                      title="Próximamente"
                    >
                      Próximamente
                    </button>
                  }
                />
              </div>

              {/* Tarjeta 7: Repositorio de Documentos */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="📚"
                  iconVariant="secondary"
                  title="Repositorio de Documentos"
                  description="Accede y gestiona documentos compartidos del área de datos"
                  action={
                    hasTemplateAccess ? (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => router.push("/dashboard/documents")}
                      >
                        Acceder
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled
                        title="No tienes permisos para acceder al repositorio"
                      >
                        No disponible
                      </button>
                    )
                  }
                />
              </div>

              {/* Tarjeta 8: Plantillas de Documentos (NUEVA) */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="📄"
                  iconVariant="success"
                  title="Plantillas de Documentos"
                  description="Modelos preformateados para informes, reportes y documentos oficiales"
                  action={
                    hasTemplateAccess ? (
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() =>
                          router.push("/dashboard/document-templates")
                        }
                      >
                        Acceder
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled
                        title="No tienes permisos para acceder a las plantillas"
                      >
                        No disponible
                      </button>
                    )
                  }
                />
              </div>

              {/* Tarjeta 9: Panel de Administración Datos (con ícono mejorado) */}
              <div className="col-md-6 col-lg-4 mb-4">
                <DashboardCard
                  icon="🖥️"
                  iconVariant="warning"
                  title="Panel de Administración Datos"
                  description="Configuración del sistema, usuarios y permisos (solo administradores)"
                  action={
                    hasAdminAccess ? (
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => router.push(specificDashboardRoute)}
                      >
                        Acceder
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled
                        title="Se requieren permisos de administrador"
                      >
                        No disponible
                      </button>
                    )
                  }
                />
              </div>

              {/* Campos comentados - Mantenidos como estaban */}
              {/* 
 <div className="col-md-6 col-lg-4 mb-4">
  <DashboardCard
    icon="👥"
    iconVariant="success"
    title="Gestión de Personal"
    description="Administración de colaboradores y recursos humanos"
    action={
      <button className="btn btn-outline-success btn-sm">
        Acceder
      </button>
    }
  />
</div>
              */}

              {/* 
 <div className="col-md-6 col-lg-4 mb-4">
  <DashboardCard
    icon="📈"
    iconVariant="warning"
    title="Dashboard Ejecutivo"
    description="Indicadores clave de rendimiento y métricas de negocio"
    action={
      <button className="btn btn-outline-warning btn-sm">
        Acceder
      </button>
    }
  />
</div>
              */}

              {/* 
 <div className="col-md-6 col-lg-4 mb-4">
  <DashboardCard
    icon="🔐"
    iconVariant="secondary"
    title="Administración"
    description="Configuración y gestión del sistema y usuarios"
    action={
      <button className="btn btn-outline-secondary btn-sm">
        Acceder
      </button>
    }
  />
</div>
              */}

              {/* 
 <div className="col-md-6 col-lg-4 mb-4">
  <DashboardCard
    icon="🛠️"
    iconVariant="dark"
    title="Soporte Técnico"
    description="Sistema de tickets y asistencia técnica"
    action={
      <button className="btn btn-outline-dark btn-sm">
        Acceder
      </button>
    }
  />
</div>
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
