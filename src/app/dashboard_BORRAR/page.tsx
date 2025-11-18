// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function DashboardPage() {
  const { user, userRole } = useAuth();
  const router = useRouter();

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  if (!user) {
    return null; // O un spinner de carga
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <h1 className="display-4 fw-bold text-center text-primary">
            Intranet de Datos y Comportamiento
          </h1>
        </div>
      </div>

      <div className="row">
        {/* Sección principal - Tarjetas de aplicativos */}
        <div className="col-lg-8">
          <div className="row">
            <div className="col-12 mb-4">
              <h3 className="fw-bold">Aplicativos del Área</h3>
              <p className="text-muted">
                Accede a las herramientas disponibles para tu rol
              </p>
            </div>

            {/* Tarjetas dinámicas - POR AHORA VACÍAS, LAS CREAREMOS DESPUÉS */}
            <div className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <div
                    className="bg-primary text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                    style={{ width: "60px", height: "60px" }}
                  >
                    <i
                      className="bi bi-grid-3x3-gap-fill"
                      style={{ fontSize: "1.5rem" }}
                    ></i>
                  </div>
                  <h6 className="card-title">Aplicativo 1</h6>
                  <p className="card-text small text-muted">
                    Descripción breve del aplicativo
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <div
                    className="bg-success text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                    style={{ width: "60px", height: "60px" }}
                  >
                    <i
                      className="bi bi-bar-chart-fill"
                      style={{ fontSize: "1.5rem" }}
                    ></i>
                  </div>
                  <h6 className="card-title">Aplicativo 2</h6>
                  <p className="card-text small text-muted">
                    Descripción breve del aplicativo
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <div
                    className="bg-warning text-white rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
                    style={{ width: "60px", height: "60px" }}
                  >
                    <i
                      className="bi bi-people-fill"
                      style={{ fontSize: "1.5rem" }}
                    ></i>
                  </div>
                  <h6 className="card-title">Aplicativo 3</h6>
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
          <div className="card shadow">
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

              <h5 className="card-title">{user.displayName || "Usuario"}</h5>
              <p className="text-muted">{user.email}</p>
              <p className="badge bg-info text-dark">
                {userRole || "Sin rol asignado"}
              </p>

              <div className="d-grid gap-2 mt-4">
                <Link href="/perfil" className="btn btn-outline-primary">
                  <i className="bi bi-pencil-square me-2"></i>
                  Editar Perfil
                </Link>

                <button
                  className="btn btn-primary"
                  onClick={() => router.push("/")} // Redirige al dashboard específico del rol
                >
                  <i className="bi bi-speedometer2 me-2"></i>
                  Ir a Mi Dashboard Específico
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
