"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";

export default function CandidateDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
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

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div
      className="min-vh-100 py-4 position-relative"
      style={{ backgroundColor: "#001F3F", color: "white" }}
    >
      {/* Dropdown de perfil en esquina superior derecha */}
      <div className="position-absolute top-0 end-0 m-3" ref={dropdownRef}>
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
                <span className="badge bg-warning text-dark">Candidato</span>
              </div>

              <hr className="my-2" />

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
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="text-center">
              {/* Icono de advertencia */}
              <div
                className="bg-warning rounded-circle mx-auto d-flex align-items-center justify-content-center mb-4"
                style={{ width: "100px", height: "100px" }}
              >
                <span style={{ fontSize: "3rem" }}>⏳</span>
              </div>

              {/* Título principal */}
              <h1 className="display-5 fw-bold text-white mb-3">
                Usuario registrado sin autorización de ingreso
              </h1>

              {/* Mensaje explicativo */}
              <div className="card bg-light shadow-sm mb-4">
                <div className="card-body">
                  <p className="text-dark mb-3">
                    Tu cuenta ha sido registrada exitosamente, pero aún no
                    cuentas con los permisos necesarios para acceder a la
                    plataforma.
                  </p>

                  <div className="alert alert-info mb-0">
                    <small>
                      <strong>Estado:</strong> Pendiente de aprobación
                      <br />
                      <strong>Rol actual:</strong> Candidato
                      <br />
                      <strong>Acción requerida:</strong> Contacta al
                      administrador del sistema
                    </small>
                  </div>
                </div>
              </div>

              {/* Información de contacto */}
              <div className="card bg-light shadow-sm">
                <div className="card-body">
                  <h6 className="text-dark mb-3">Para solicitar acceso:</h6>
                  <div className="text-start text-muted small">
                    <p className="mb-2">
                      <span className="me-2">📧</span>
                      Envía un correo al administrador del sistema
                    </p>
                    <p className="mb-2">
                      <span className="me-2">👥</span>
                      Contacta al departamento de Recursos Humanos
                    </p>
                    <p className="mb-0">
                      <span className="me-2">⏰</span>
                      El proceso de aprobación puede tomar hasta 48 horas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
