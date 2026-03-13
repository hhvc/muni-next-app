// src/components/lookers/LookersManager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { LookerDashboardMetadata } from "@/types/lookerTypes";
import DashboardCreator from "@/components/lookers/DashboardCreator";
import LoadingSpinner from "@/components/LoadingSpinner";
import DashboardsTable from "@/components/lookers/DashboardsTable";
import DashboardsGrid from "@/components/lookers/DashboardsGrid";

type ManagerView = "view" | "create" | "edit";

export default function LookersManager() {
  const { user, userRoles } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<ManagerView>("view");
  const [dashboards, setDashboards] = useState<LookerDashboardMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDashboard, setSelectedDashboard] =
    useState<LookerDashboardMetadata | null>(null);
  const [showAllDashboards, setShowAllDashboards] = useState(false); // <-- Nuevo estado

  // Verificar permisos para crear tableros
  const canCreateDashboards =
    userRoles?.some((role) => ["admin", "hr", "root", "data"].includes(role)) ??
    false;

  // Verificar permisos para editar/eliminar tableros
  const canEditDashboards =
    userRoles?.some((role) => ["admin", "root"].includes(role)) ?? false;

  // Función para normalizar allowedRoles
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
    [],
  );

  // Función para convertir Firestore Timestamp a Date
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

  // Cargar tableros
  const fetchDashboards = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const dashboardsRef = collection(db, "dashboards");
      const querySnapshot = await getDocs(dashboardsRef);
      const dashboardsData: LookerDashboardMetadata[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const normalizedAllowedRoles = normalizeAllowedRoles(data.allowedRoles);

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
          order: data.order || 0,
        };

        dashboardsData.push(dashboard);
      });

      // Ordenar por fecha de creación descendente (los más recientes primero)
      dashboardsData.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
      });

      setDashboards(dashboardsData);
      setError("");
    } catch (err) {
      console.error("❌ Error al cargar tableros:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(
        `Error al cargar tableros: ${
          firebaseError.message || "Error desconocido"
        }`,
      );
    } finally {
      setLoading(false);
    }
  }, [user, normalizeAllowedRoles, toSafeDate]);

  // Cargar tableros cuando cambia el refreshKey
  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards, refreshKey]);

  // Manejar éxito en la creación
  const handleDashboardCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveView("view");
    setSelectedDashboard(null);
    setShowAllDashboards(false); // Resetear a vista de 6 tableros
  };

  // Manejar edición de tablero
  const handleEditDashboard = (dashboard: LookerDashboardMetadata) => {
    setSelectedDashboard(dashboard);
    setActiveView("edit");
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setSelectedDashboard(null);
    setActiveView("view");
  };

  // Manejar eliminación de tablero
  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!canEditDashboards || !dashboardId) {
      setError("No tienes permisos para eliminar tableros");
      return;
    }

    try {
      await deleteDoc(doc(db, "dashboards", dashboardId));
      setRefreshKey((prev) => prev + 1);
      setError("");
    } catch (err) {
      console.error("❌ Error al eliminar tablero:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(
        `Error al eliminar tablero: ${
          firebaseError.message || "Error desconocido"
        }`,
      );
    }
  };

  // Manejar activación/desactivación de tablero
  const handleToggleDashboardStatus = async (
    dashboard: LookerDashboardMetadata,
  ) => {
    if (!canEditDashboards || !dashboard.id) {
      setError("No tienes permisos para editar tableros");
      return;
    }

    try {
      await updateDoc(doc(db, "dashboards", dashboard.id), {
        isActive: !dashboard.isActive,
        updatedAt: Timestamp.now(),
      });
      setRefreshKey((prev) => prev + 1);
      setError("");
    } catch (err) {
      console.error("❌ Error al cambiar estado del tablero:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(
        `Error al cambiar estado: ${
          firebaseError.message || "Error desconocido"
        }`,
      );
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="container-fluid">
      {/* Tabs de navegación */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeView === "view" ? "active" : ""}`}
            onClick={() => {
              setActiveView("view");
              setSelectedDashboard(null);
              setShowAllDashboards(false); // Resetear vista al cambiar tab
            }}
          >
            <i className="bi bi-bar-chart-line me-2"></i>
            Ver Tableros
            <span className="badge bg-secondary ms-2">{dashboards.length}</span>
          </button>
        </li>
        {canCreateDashboards && activeView !== "edit" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeView === "create" ? "active" : ""}`}
              onClick={() => setActiveView("create")}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Tablero
            </button>
          </li>
        )}
        {activeView === "edit" && selectedDashboard && (
          <li className="nav-item">
            <button className="nav-link active" disabled>
              <i className="bi bi-pencil me-2"></i>
              Editando: {selectedDashboard.title}
            </button>
          </li>
        )}
      </ul>

      {/* Mensajes de error */}
      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show mb-4"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Cerrar"
          ></button>
        </div>
      )}

      {/* Contenido de los tabs */}
      <div className="tab-content">
        {activeView === "view" && (
          <div key={refreshKey}>
            {loading ? (
              <div className="text-center py-5">
                <LoadingSpinner />
                <p className="mt-3 text-muted">Cargando Tableros...</p>
              </div>
            ) : dashboards.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="bi bi-bar-chart-line text-muted"
                    style={{ fontSize: "4rem" }}
                  ></i>
                </div>
                <h4 className="text-muted">No hay tableros registrados</h4>
                <p className="text-muted mb-4">
                  Comienza registrando tu primer tablero de Looker Studio
                </p>
                {canCreateDashboards && (
                  <button
                    className="btn btn-info text-white"
                    onClick={() => setActiveView("create")}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Registrar Primer Tablero
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Resumen de estadísticas */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-0  themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">{dashboards.length}</h3>
                        <p className="text-muted mb-0">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0  themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {dashboards.filter((d) => d.isActive).length}
                        </h3>
                        <p className="text-muted mb-0">Activos</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0  themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {
                            Array.from(
                              new Set(
                                dashboards
                                  .map((d) => d.category)
                                  .filter(Boolean),
                              ),
                            ).length
                          }
                        </h3>
                        <p className="text-muted mb-0">Categorías</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {
                            dashboards.filter(
                              (d) =>
                                d.allowedRoles && d.allowedRoles.length > 0,
                            ).length
                          }
                        </h3>
                        <p className="text-muted mb-0">Con restricciones</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de tableros */}
                <DashboardsTable
                  dashboards={dashboards}
                  canEditDashboards={canEditDashboards}
                  formatDate={formatDate}
                  onEdit={handleEditDashboard}
                  onToggleStatus={handleToggleDashboardStatus}
                  onDelete={handleDeleteDashboard}
                />

                {/* Vista en grid (opcional) */}
                <DashboardsGrid />
              </div>
            )}
          </div>
        )}

        {(activeView === "create" || activeView === "edit") && (
          <div className="row">
            <div className="col-12 col-lg-8">
              <DashboardCreator
                onSuccess={handleDashboardCreated}
                dashboardToEdit={
                  activeView === "edit" ? selectedDashboard : undefined
                }
                onCancel={activeView === "edit" ? handleCancelEdit : undefined}
              />
            </div>
            <div className="col-12 col-lg-4">
              <div
                className="card border-0 shadow-sm sticky-top"
                style={{ top: "20px" }}
              >
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="bi bi-lightbulb text-info me-2"></i>
                    Tips para tableros de Looker Studio
                  </h5>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <small className="text-muted">
                        1. Asegúrate de que el tablero tenga permisos públicos
                        de visualización
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        2. Usa la URL de embed si está disponible para mejor
                        integración
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        3. Agrega una imagen de vista previa para mejor
                        experiencia
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        4. Especifica la fuente de datos y frecuencia de
                        actualización
                      </small>
                    </li>
                    <li>
                      <small className="text-muted">
                        5. Asigna categorías para organizar tus tableros
                      </small>
                    </li>
                  </ul>

                  {activeView === "edit" && selectedDashboard && (
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="text-info">
                        <i className="bi bi-info-circle me-2"></i>
                        Editando Tablero
                      </h6>
                      <p className="small text-muted">
                        Estás editando:{" "}
                        <strong>{selectedDashboard.title}</strong>
                      </p>
                      <p className="small text-muted">
                        Creado: {formatDate(selectedDashboard.createdAt)}
                      </p>
                      <button
                        className="btn btn-outline-secondary btn-sm w-100"
                        onClick={handleCancelEdit}
                      >
                        <i className="bi bi-arrow-left me-1"></i>
                        Cancelar Edición
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
