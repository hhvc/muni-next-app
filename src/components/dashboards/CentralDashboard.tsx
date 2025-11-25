// src/components/dashboards/CentralDashboard.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

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
      default:
        return "/dashboard/root";
    }
  };

  const specificDashboardRoute = getDashboardRoute(userRole);

  return (
    <div
      className="min-vh-100 py-4"
      style={{ backgroundColor: "#001F3F", color: "white" }}
    >
      {/* Contenido principal */}
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <h1 className="display-4 fw-bold text-center text-white mb-2">
              Ciencia de Datos y Comportamiento
            </h1>
            <p className="text-center text-light lead">
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
                <h2 className="fw-bold text-white mb-3">
                  Aplicativos del Área
                </h2>
                <p className="text-light mx-auto" style={{ maxWidth: "600px" }}>
                  Accede a las herramientas y sistemas disponibles según tu rol
                  y permisos asignados
                </p>
              </div>

              {/* Tarjetas de aplicativos */}
              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light transition-all hover-shadow">
                  <div className="card-body text-center p-4">
                    <div
                      className="bg-primary text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "70px", height: "70px" }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>📊</span>
                    </div>
                    <h5 className="card-title text-dark mb-2">
                      Análisis de Datos
                    </h5>
                    <p className="card-text small text-muted mb-3">
                      Sistema de reportes y análisis de métricas
                      organizacionales
                    </p>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => router.push(specificDashboardRoute)}
                    >
                      Acceder
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light transition-all hover-shadow">
                  <div className="card-body text-center p-4">
                    <div
                      className="bg-success text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "70px", height: "70px" }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>👥</span>
                    </div>
                    <h5 className="card-title text-dark mb-2">
                      Gestión de Personal
                    </h5>
                    <p className="card-text small text-muted mb-3">
                      Administración de colaboradores y recursos humanos
                    </p>
                    <button className="btn btn-outline-success btn-sm">
                      Acceder
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light transition-all hover-shadow">
                  <div className="card-body text-center p-4">
                    <div
                      className="bg-warning text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "70px", height: "70px" }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>📈</span>
                    </div>
                    <h5 className="card-title text-dark mb-2">
                      Dashboard Ejecutivo
                    </h5>
                    <p className="card-text small text-muted mb-3">
                      Indicadores clave de rendimiento y métricas de negocio
                    </p>
                    <button className="btn btn-outline-warning btn-sm">
                      Acceder
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjetas adicionales */}
              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light hover-shadow">
                  <div className="card-body text-center p-4">
                    <div
                      className="bg-info text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "70px", height: "70px" }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>📋</span>
                    </div>
                    <h5 className="card-title text-dark mb-2">Formularios</h5>
                    <p className="card-text small text-muted mb-3">
                      Sistema de formularios y solicitudes internas
                    </p>
                    <button className="btn btn-outline-info btn-sm">
                      Acceder
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light hover-shadow">
                  <div className="card-body text-center p-4">
                    <div
                      className="bg-secondary text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "70px", height: "70px" }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>🔐</span>
                    </div>
                    <h5 className="card-title text-dark mb-2">
                      Administración
                    </h5>
                    <p className="card-text small text-muted mb-3">
                      Configuración y gestión del sistema y usuarios
                    </p>
                    <button className="btn btn-outline-secondary btn-sm">
                      Acceder
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light hover-shadow">
                  <div className="card-body text-center p-4">
                    <div
                      className="bg-dark text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "70px", height: "70px" }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>🛠️</span>
                    </div>
                    <h5 className="card-title text-dark mb-2">
                      Soporte Técnico
                    </h5>
                    <p className="card-text small text-muted mb-3">
                      Sistema de tickets y asistencia técnica
                    </p>
                    <button className="btn btn-outline-dark btn-sm">
                      Acceder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos CSS para hover effects */}
      <style jsx>{`
        .hover-shadow:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
          transition: all 0.3s ease;
        }
        .transition-all {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}
