// src/components/dashboards/CentralDashboard.tsx
"use client";

import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { useState, useRef, useEffect } from "react";

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
  const { signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div
      className="min-vh-100 py-4 position-relative"
      style={{ backgroundColor: "#001F3F", color: "white" }}
    >
      {/* Dropdown de perfil en esquina superior derecha */}
      <div className="position-absolute top-0 end-0 m-3" ref={dropdownRef}>
        {/* Botón de imagen del usuario */}
        <button
          className="btn p-0 border-0 bg-transparent"
          onClick={toggleDropdown}
          style={{ cursor: "pointer" }}
        >
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Foto de perfil"
              width={50}
              height={50}
              className="rounded-circle border border-3 border-white shadow"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              className="bg-secondary rounded-circle d-flex align-items-center justify-content-center shadow"
              style={{
                width: "50px",
                height: "50px",
                border: "3px solid white",
              }}
            >
              <span className="text-white fw-bold fs-5">
                {user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : "U"}
              </span>
            </div>
          )}
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div
            className="position-absolute end-0 mt-2 card shadow-lg bg-light"
            style={{
              width: "280px",
              zIndex: 1000,
              animation: "fadeIn 0.2s ease-in-out",
            }}
          >
            <div className="card-body p-3">
              {/* Información del usuario */}
              <div className="text-center mb-3">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="Foto de perfil"
                    width={60}
                    height={60}
                    className="rounded-circle border mb-2"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="bg-secondary rounded-circle mx-auto d-flex align-items-center justify-content-center mb-2"
                    style={{ width: "60px", height: "60px" }}
                  >
                    <span className="text-white fw-bold fs-4">
                      {user.displayName
                        ? user.displayName.charAt(0).toUpperCase()
                        : "U"}
                    </span>
                  </div>
                )}

                <h6 className="card-title text-dark mb-1">
                  {user.displayName || "Usuario"}
                </h6>
                <p className="text-muted small mb-1">{user.email}</p>
                <span className="badge bg-info text-dark">
                  {userRole || "Sin rol asignado"}
                </span>
              </div>

              <hr className="my-2" />

              {/* Botones de acción */}
              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => {
                    router.push("/perfil");
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="me-2">✏️</span>
                  Editar Perfil
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    router.push(specificDashboardRoute);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="me-2">🚀</span>
                  Mi Dashboard Específico
                </button>

                <button
                  className="btn btn-outline-danger btn-sm mt-1"
                  onClick={handleLogout}
                >
                  <span className="me-2">🚪</span>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col">
            <h1 className="display-4 fw-bold text-center text-white mb-2">
              Intranet de Datos y Comportamiento
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
                <div className="card h-100 shadow-sm bg-light transition-all">
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
                    <button className="btn btn-outline-primary btn-sm">
                      Acceder
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm bg-light transition-all">
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
                <div className="card h-100 shadow-sm bg-light transition-all">
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
                <div className="card h-100 shadow-sm bg-light">
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
                <div className="card h-100 shadow-sm bg-light">
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
                <div className="card h-100 shadow-sm bg-light">
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

      {/* Estilos CSS para la animación */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
