// src/components/UserProfileDropdown.tsx
"use client";

import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { useState, useRef, useEffect } from "react";

interface UserProfileDropdownProps {
  user: User;
  userRole: string;
}

export default function UserProfileDropdown({
  user,
  userRole,
}: UserProfileDropdownProps) {
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

  // Determinar la ruta del dashboard específico según el rol
  const getDashboardRoute = (role: string) => {
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
    <div className="position-relative user-profile-dropdown" ref={dropdownRef}>
      {/* Botón de imagen del usuario - AHORA MÁS GRANDE */}
      <button
        className="btn p-0 border-0 bg-transparent d-flex align-items-center"
        onClick={toggleDropdown}
        style={{ cursor: "pointer" }}
        aria-label="Menú de perfil"
      >
        <div className="text-end me-2 d-none d-sm-block">
          <div className="user-name fw-semibold small">
            {user.displayName || "Usuario"}
          </div>
          <div className="user-role small" style={{ fontSize: "0.75rem" }}>
            {userRole}
          </div>
        </div>

        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt="Foto de perfil"
            width={60} // Aumentado de 45 a 60
            height={60} // Aumentado de 45 a 60
            className="rounded-circle border border-2 border-white shadow"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            className="bg-secondary rounded-circle d-flex align-items-center justify-content-center shadow"
            style={{
              width: "60px", // Aumentado de 45 a 60
              height: "60px", // Aumentado de 45 a 60
              border: "2px solid white",
            }}
          >
            <span className="user-initial fw-bold fs-5">
              {" "}
              {/* Texto ligeramente más grande */}
              {user.displayName
                ? user.displayName.charAt(0).toUpperCase()
                : "U"}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown menu - MANTENIDO IGUAL */}
      {isDropdownOpen && (
        <div
          className="position-absolute end-0 mt-2 card shadow-lg border-0"
          style={{
            width: "280px",
            zIndex: 1050,
          }}
        >
          <div className="card-body p-3">
            {/* Información del usuario */}
            <div className="text-center mb-3">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt="Foto de perfil"
                  width={80} // Opcional: también aumentar en el dropdown
                  height={80} // Opcional: también aumentar en el dropdown
                  className="rounded-circle border border-3 mb-2"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  className="bg-secondary rounded-circle mx-auto d-flex align-items-center justify-content-center mb-2"
                  style={{ width: "80px", height: "80px" }} // Aumentado de 70 a 80
                >
                  <span className="text-white fw-bold fs-4">
                    {user.displayName
                      ? user.displayName.charAt(0).toUpperCase()
                      : "U"}
                  </span>
                </div>
              )}

              <h6 className="card-title user-name mb-1 fw-bold">
                {user.displayName || "Usuario"}
              </h6>
              <p className="user-email small mb-1">{user.email}</p>
              <span className="badge bg-primary">
                {userRole || "Sin rol asignado"}
              </span>
            </div>

            <hr className="my-2" />

            {/* Botones de acción */}
            <div className="d-grid gap-2">
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center"
                onClick={() => {
                  router.push("/perfil");
                  setIsDropdownOpen(false);
                }}
              >
                <span className="me-2">✏️</span>
                Editar Perfil
              </button>

              {/* <button
                className="btn btn-primary btn-sm d-flex align-items-center justify-content-center"
                onClick={() => {
                  router.push(specificDashboardRoute);
                  setIsDropdownOpen(false);
                }}
              >
                <span className="me-2">📊</span>
                Mi Dashboard
              </button> */}

              <button
                className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center mt-1"
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
  );
}
