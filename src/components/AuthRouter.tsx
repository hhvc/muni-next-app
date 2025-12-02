// src/components/AuthRouter.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import GoogleSignInPage from "@/components/GoogleSignInPage";
import CentralDashboard from "@/components/dashboards/CentralDashboard";
import CandidateDashboard from "@/app/candidate/page";
import Unauthorized from "@/components/Unauthorized";
import LoadingSpinner from "@/components/LoadingSpinner";

// Páginas que se muestran sin el layout principal (standalone)
const STANDALONE_PAGES = ["/", "/candidate"];

// Definir roles autorizados y no autorizados
const authorizedRoles = ["root", "admin", "hr", "data", "collaborator"];
const unauthorizedRoles = ["nuevo", "", "Sin rol", "pending_verification"];

export function AuthRouter({ children }: { children: React.ReactNode }) {
  const { user, userRole, userRoles, loadingUserStatus } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Verificar si el usuario tiene al menos un rol autorizado
  const hasAuthorizedRole = userRoles?.some((role) =>
    authorizedRoles.includes(role)
  );

  // Verificar si el usuario solo tiene roles no autorizados
  const hasOnlyUnauthorizedRoles =
    userRoles?.every((role) => unauthorizedRoles.includes(role)) || false;

  // Efecto para manejar redirecciones básicas
  useEffect(() => {
    // No hacer nada mientras carga
    if (loadingUserStatus) return;

    // Si no hay pathname, esperar
    if (!pathname) return;

    // Si no hay usuario y no está en la página de login, redirigir a login
    if (!user && pathname !== "/") {
      router.push("/");
      return;
    }

    // Si hay usuario y es candidato, redirigir a /candidate si no está allí
    if (user && userRole === "candidate" && pathname !== "/candidate") {
      router.push("/candidate");
      return;
    }

    // Si hay usuario con roles no autorizados y está en una ruta protegida, redirigir a /
    if (
      user &&
      hasOnlyUnauthorizedRoles &&
      !STANDALONE_PAGES.includes(pathname)
    ) {
      router.push("/");
      return;
    }

    // ELIMINADO: Redirecciones automáticas a dashboards específicos por rol
    // Los usuarios autorizados permanecen en la ruta que eligieron
  }, [
    user,
    userRole,
    userRoles,
    loadingUserStatus,
    pathname,
    router,
    hasAuthorizedRole,
    hasOnlyUnauthorizedRoles,
  ]);

  // Mostrar loading mientras se verifica autenticación
  if (loadingUserStatus) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Verificar si es una página standalone (usando pathname o cadena vacía si es null)
  const currentPath = pathname || "";
  const isStandalonePage = STANDALONE_PAGES.includes(currentPath);

  // Lógica para páginas standalone
  if (isStandalonePage) {
    // Usuario no autenticado - mostrar página de login
    if (!user) {
      return <GoogleSignInPage />;
    }

    // Usuario candidato - mostrar dashboard de candidato
    if (userRole === "candidate") {
      return <CandidateDashboard />;
    }

    // Usuario con roles no autorizados - mostrar página de no autorizado
    if (hasOnlyUnauthorizedRoles) {
      return <Unauthorized />;
    }

    // Usuario con rol autorizado en página principal - mostrar dashboard central
    if (pathname === "/" && hasAuthorizedRole) {
      return <CentralDashboard />;
    }

    // Para otras páginas standalone con usuario autorizado, mostrar children
    return <>{children}</>;
  }

  // Para páginas protegidas (no standalone), verificar autenticación
  if (!user) {
    // Redirigir a login si no está autenticado (el useEffect se encargará)
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Si es candidato en una página protegida, redirigir (el useEffect se encargará)
  if (userRole === "candidate") {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Si tiene solo roles no autorizados en página protegida, redirigir (el useEffect se encargará)
  if (hasOnlyUnauthorizedRoles) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Usuario autenticado con rol válido - mostrar el contenido normal
  return <>{children}</>;
}
