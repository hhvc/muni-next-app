// src/components/AuthRouter.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import GoogleSignInPage from "@/components/GoogleSignInPage";
import CentralDashboard from "@/components/dashboards/CentralDashboard";
import CandidateDashboard from "@/app/candidate/page";
import LoadingSpinner from "@/components/LoadingSpinner";

// Función para obtener la ruta del dashboard según el rol
const getDashboardRoute = (userRole: string | null): string => {
  const routes: { [key: string]: string } = {
    admin: "/dashboard/admin",
    hr: "/dashboard/hr",
    collaborator: "/dashboard/collaborator",
    data: "/dashboard/data",
    root: "/dashboard/root",
    candidate: "/candidate",
  };

  return routes[userRole || ""] || "/";
};

// Páginas que se muestran sin el layout principal (standalone)
const STANDALONE_PAGES = ["/", "/candidate"];

export function AuthRouter({ children }: { children: React.ReactNode }) {
  const { user, userRole, loadingUserStatus } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Efecto para manejar redirecciones automáticas
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

    // Si hay usuario con otro rol y está en /candidate, redirigir a su dashboard
    if (
      user &&
      userRole &&
      userRole !== "candidate" &&
      pathname === "/candidate"
    ) {
      const dashboardRoute = getDashboardRoute(userRole);
      router.push(dashboardRoute);
      return;
    }

    // Si hay usuario con rol y está en la raíz, redirigir a su dashboard
    if (user && userRole && userRole !== "candidate" && pathname === "/") {
      const dashboardRoute = getDashboardRoute(userRole);
      router.push(dashboardRoute);
      return;
    }
  }, [user, userRole, loadingUserStatus, pathname, router]);

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

    // Usuario con otro rol en página standalone - mostrar dashboard central
    // ✅ CORREGIDO: CentralDashboard ahora usa el contexto internamente, no necesita props
    return <CentralDashboard />;
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

  // Usuario autenticado con rol válido - mostrar el contenido normal
  return <>{children}</>;
}
