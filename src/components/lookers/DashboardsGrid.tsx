// src/components/lookers/DashboardsGrid.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { LookerDashboardMetadata } from "@/types/lookerTypes";
import DashboardCard from "./DashboardCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardsGridProps {
  category?: string;
  showInactive?: boolean;
}

/**
 * Contenedor responsivo para grilla de tarjetas
 * - Mobile: 1 columna
 * - Desktop común: 2 columnas
 * - Pantallas XL: 3 columnas
 */
function DashboardsGridContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="row g-4 row-cols-1 row-cols-md-2 row-cols-xl-3">
      {children}
    </div>
  );
}

export default function DashboardsGrid({
  category,
  showInactive = false,
}: DashboardsGridProps) {
  const { user, userRoles } = useAuth();
  const [dashboards, setDashboards] = useState<LookerDashboardMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Normaliza allowedRoles desde Firestore
   */
  const normalizeAllowedRoles = useCallback(
    (roles: unknown): string[] | null => {
      if (!roles) return null;

      if (Array.isArray(roles)) {
        return roles.map((role) => String(role));
      }

      if (typeof roles === "string") {
        try {
          const parsed = JSON.parse(roles);
          if (Array.isArray(parsed)) {
            return parsed.map((role) => String(role));
          }
          return [roles];
        } catch {
          return [roles];
        }
      }

      return null;
    },
    []
  );

  /**
   * Convierte distintos formatos de timestamp a Date
   */
  const toSafeDate = useCallback((timestamp: unknown): Date | null => {
    if (!timestamp) return null;

    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }

    const timestampObj = timestamp as { toDate?: () => Date };
    if (typeof timestampObj.toDate === "function") {
      return timestampObj.toDate();
    }

    const timestampWithSeconds = timestamp as {
      seconds?: number;
      nanoseconds?: number;
    };
    if (timestampWithSeconds.seconds) {
      return new Date(timestampWithSeconds.seconds * 1000);
    }

    return null;
  }, []);

  const getOrderValue = useCallback((order: number | undefined): number => {
    return order || 0;
  }, []);

  useEffect(() => {
    const fetchDashboards = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const dashboardsRef = collection(db, "dashboards");
        const querySnapshot = await getDocs(dashboardsRef);
        const dashboardsData: LookerDashboardMetadata[] = [];

        const currentUserRoles = userRoles || [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();

          const normalizedAllowedRoles = normalizeAllowedRoles(
            data.allowedRoles
          );

          const dashboard: LookerDashboardMetadata = {
            id: doc.id,
            title: data.title || "Sin título",
            description: data.description || null,
            dashboardUrl: data.dashboardUrl || "#",
            embedUrl: data.embedUrl || null,
            thumbnailUrl: data.thumbnailUrl || null,
            category: data.category || null,
            reportId: data.reportId || null,
            dataSource: data.dataSource || null,
            refreshFrequency: data.refreshFrequency || null,
            owner: data.owner || null,
            tags: Array.isArray(data.tags) ? data.tags : null,
            createdBy: data.createdBy || user.uid,
            createdAt: toSafeDate(data.createdAt),
            updatedAt: toSafeDate(data.updatedAt),
            isActive: data.isActive !== false,
            allowedRoles: normalizedAllowedRoles,
            order: data.order,
          };

          if (!showInactive && !dashboard.isActive) return;
          if (category && dashboard.category !== category) return;

          const shouldShowDashboard = () => {
            if (
              !dashboard.allowedRoles ||
              dashboard.allowedRoles.length === 0
            ) {
              return true;
            }

            if (currentUserRoles.length > 0) {
              return currentUserRoles.some((role: string) =>
                dashboard.allowedRoles?.includes(role)
              );
            }

            return false;
          };

          if (shouldShowDashboard()) {
            dashboardsData.push(dashboard);
          }
        });

        dashboardsData.sort((a, b) => {
          const orderA = getOrderValue(a.order);
          const orderB = getOrderValue(b.order);

          if (orderA !== orderB) return orderA - orderB;
          return (a.title || "").localeCompare(b.title || "");
        });

        setDashboards(dashboardsData);
        setError("");
      } catch (err) {
        console.error("❌ Error al cargar tableros:", err);

        const firebaseError = err as { code?: string; message?: string };

        if (firebaseError.code === "failed-precondition") {
          setError(
            "Error de configuración en la base de datos. Contacta al administrador."
          );
        } else {
          setError(
            `No se pudieron cargar los tableros: ${
              firebaseError.message || "Error desconocido"
            }`
          );
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchDashboards, 100);
    return () => clearTimeout(timer);
  }, [
    user,
    userRoles,
    category,
    showInactive,
    normalizeAllowedRoles,
    toSafeDate,
    getOrderValue,
  ]);

  /* =========================
     Estados de carga / error
     ========================= */

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert dashboard-alert" role="alert">
        <h5 className="alert-heading">⚠️ Error</h5>
        <p className="mb-0">{error}</p>
        <button
          className="btn btn-sm btn-outline-theme mt-2"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="text-center py-5">
        <h4 className="empty-state-title">No hay tableros disponibles</h4>
        <p className="empty-state-text">
          {category
            ? `No se encontraron tableros en la categoría "${category}"`
            : "Aún no se han registrado tableros."}
        </p>
        <button
          className="btn btn-outline-theme"
          onClick={() => window.location.reload()}
        >
          Recargar
        </button>
      </div>
    );
  }

  /* =========================
     Render principal
     ========================= */

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="dashboards-title">Tableros de Looker Studio</h3>
          {category && (
            <span className="badge bg-info">Categoría: {category}</span>
          )}
        </div>
        <small className="dashboards-count">
          {dashboards.length} tablero(s)
        </small>
      </div>

      <DashboardsGridContainer>
        {dashboards.map((dashboard) => (
          <div className="col" key={dashboard.id}>
            <DashboardCard
              title={dashboard.title}
              description={dashboard.description || undefined}
              dashboardUrl={dashboard.dashboardUrl}
              embedUrl={dashboard.embedUrl || undefined}
              thumbnailUrl={dashboard.thumbnailUrl || undefined}
              target="_blank"
              badge={dashboard.category || undefined}
              badgeColor="info"
              showThumbnail
            />
          </div>
        ))}
      </DashboardsGridContainer>
    </div>
  );
}
