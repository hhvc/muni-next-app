// src/components/dashboards/CentralDashboard.tsx
"use client";

import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CentralDashboardProps {
  user: User;
  userRole: string;
  specificDashboardRoute: string;
}

export default function CentralDashboard({
  user,
  userRole,
  specificDashboardRoute,
}: CentralDashboardProps) {
  const router = useRouter();

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center py-4"
      style={{ backgroundColor: "#001F3F", color: "white" }}
    >
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <h1 className="display-4 fw-bold text-center text-white">
              Intranet de Datos y Comportamiento
            </h1>
          </div>
        </div>

        <div className="row">
          {/* Sección principal - Tarjetas de aplicativos */}
          <div className="col-lg-8">
            <div className="row">
              <div className="col-12 mb-4">
                <h3 className="fw-bold text-white">Aplicativos del Área</h3>
                <p className="text-light">
                  Accede a las herramientas disponibles para tu rol
                </p>
              </div>

              {/* Tarjetas dinámicas */}
              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 shadow-sm bg-light">
                  <div className="card-body text-center">
                    <div
                      className="bg-primary text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "60px", height: "60px" }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>📊</span>
                    </div>
                    <h6 className="card-title text-dark">Aplicativo 1</h6>
                    <p className="card-text small text-muted">
                      Descripción breve del aplicativo
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 shadow-sm bg-light">
                  <div className="card-body text-center">
                    <div
                      className="bg-success text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "60px", height: "60px" }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>👥</span>
                    </div>
                    <h6 className="card-title text-dark">Aplicativo 2</h6>
                    <p className="card-text small text-muted">
                      Descripción breve del aplicativo
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100 shadow-sm bg-light">
                  <div className="card-body text-center">
                    <div
                      className="bg-warning text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                      style={{ width: "60px", height: "60px" }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>📈</span>
                    </div>
                    <h6 className="card-title text-dark">Aplicativo 3</h6>
                    <p className="card-text small text-muted">
                      Descripción breve del aplicativo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Perfil del usuario */}
          <div className="col-lg-4">
            <div className="card shadow bg-light">
              <div className="card-header bg-primary text-white">
                <h5 className="card-title mb-0">Mi Perfil</h5>
              </div>
              <div className="card-body text-center">
                {/* Foto de perfil o ícono */}
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="Foto de perfil"
                    width={100}
                    height={100}
                    className="rounded-circle mb-3 border"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="bg-secondary rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                    style={{ width: "100px", height: "100px" }}
                  >
                    <span
                      className="text-white fw-bold"
                      style={{ fontSize: "2rem" }}
                    >
                      {user.displayName
                        ? user.displayName.charAt(0).toUpperCase()
                        : "U"}
                    </span>
                  </div>
                )}

                <h5 className="card-title text-dark">
                  {user.displayName || "Usuario"}
                </h5>
                <p className="text-muted">{user.email}</p>
                <p className="badge bg-info text-dark">
                  {userRole || "Sin rol asignado"}
                </p>

                <div className="d-grid gap-2 mt-4">
                  {/* Botón corregido para redirigir a /perfil */}
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => router.push("/perfil")}
                  >
                    <span className="me-2">✏️</span>
                    Editar Perfil
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => router.push(specificDashboardRoute)}
                  >
                    <span className="me-2">🚀</span>
                    Ir a Mi Dashboard Específico
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
