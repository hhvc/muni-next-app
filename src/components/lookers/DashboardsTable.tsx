// src/components/lookers/DashboardsTable.tsx

"use client";

import { useState, useMemo } from "react";
import { LookerDashboardMetadata } from "@/types/lookerTypes";
import DashboardThumbnail from "@/components/lookers/DashboardThumbnail";

type Props = {
  dashboards: LookerDashboardMetadata[];
  canEditDashboards: boolean;
  formatDate: (date: Date | null) => string;
  onEdit: (dashboard: LookerDashboardMetadata) => void;
  onToggleStatus: (dashboard: LookerDashboardMetadata) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

type SortField = "title" | "category" | "status" | "createdAt" | "none";
type SortOrder = "asc" | "desc";

export default function DashboardsTable({
  dashboards,
  canEditDashboards,
  formatDate,
  onEdit,
  onToggleStatus,
  onDelete,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("none");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Obtener categorías únicas
  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      dashboards
        .map((d) => d.category)
        .filter((c): c is string => Boolean(c && c.trim() !== ""))
    );
    return Array.from(categories).sort();
  }, [dashboards]);

  // Aplicar filtros y ordenamiento
  const filteredAndSortedDashboards = useMemo(() => {
    let result = dashboards.filter((dashboard) => {
      // Filtro de búsqueda
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        dashboard.title.toLowerCase().includes(searchLower) ||
        (dashboard.description &&
          dashboard.description.toLowerCase().includes(searchLower));

      // Filtro de categoría
      const matchesCategory =
        !filterCategory || dashboard.category === filterCategory;

      // Filtro de estado
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "active" ? dashboard.isActive : !dashboard.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Aplicar ordenamiento
    if (sortBy !== "none") {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case "title":
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case "category":
            aValue = (a.category || "").toLowerCase();
            bValue = (b.category || "").toLowerCase();
            break;
          case "status":
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
            break;
          case "createdAt":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          default:
            return 0;
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    return result;
  }, [dashboards, searchTerm, filterCategory, filterStatus, sortBy, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Cambiar dirección si es la misma columna
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Establecer nueva columna
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-bar-chart-line me-2"></i>
          Lista de Tableros
        </h5>
      </div>

      <div className="card-body">
        {/* Filtros */}
        <div className="row mb-3 g-2">
          {/* Búsqueda */}
          <div className="col-md-4">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="🔍 Buscar por título o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro por Categoría */}
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Botón Limpiar Filtros */}
          <div className="col-md-2">
            <button
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("");
                setFilterStatus("");
                setSortBy("none");
              }}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("title")}
                  title="Haz clic para ordenar"
                >
                  Tablero
                  {sortBy === "title" && (
                    <i
                      className={`bi bi-sort-${sortOrder === "asc" ? "down" : "up"
                        } ms-2`}
                    ></i>
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("category")}
                  title="Haz clic para ordenar"
                >
                  Categoría
                  {sortBy === "category" && (
                    <i
                      className={`bi bi-sort-${sortOrder === "asc" ? "down" : "up"
                        } ms-2`}
                    ></i>
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("status")}
                  title="Haz clic para ordenar"
                >
                  Estado
                  {sortBy === "status" && (
                    <i
                      className={`bi bi-sort-${sortOrder === "asc" ? "down" : "up"
                        } ms-2`}
                    ></i>
                  )}
                </th>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("createdAt")}
                  title="Haz clic para ordenar"
                >
                  Creado
                  {sortBy === "createdAt" && (
                    <i
                      className={`bi bi-sort-${sortOrder === "asc" ? "down" : "up"
                        } ms-2`}
                    ></i>
                  )}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedDashboards.length > 0 ? (
                filteredAndSortedDashboards.map((dashboard) => (
                  <tr key={dashboard.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <DashboardThumbnail
                          title={dashboard.title}
                          thumbnailUrl={dashboard.thumbnailUrl}
                          size={40}
                        />

                        <div>
                          <strong>{dashboard.title}</strong>

                          {dashboard.description && (
                            <div className="text-muted small">
                              {dashboard.description.length > 60
                                ? `${dashboard.description.substring(0, 60)}...`
                                : dashboard.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      {dashboard.category ? (
                        <span className="badge bg-info">
                          {dashboard.category}
                        </span>
                      ) : (
                        <span className="text-muted">Sin categoría</span>
                      )}
                    </td>

                    <td>
                      {dashboard.isActive ? (
                        <span className="badge bg-success">Activo</span>
                      ) : (
                        <span className="badge bg-secondary">Inactivo</span>
                      )}
                    </td>

                    <td>
                      <small className="text-muted">
                        {formatDate(dashboard.createdAt)}
                      </small>
                    </td>

                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <a
                          href={dashboard.embedUrl || dashboard.dashboardUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          Ver
                        </a>

                        {canEditDashboards && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => onEdit(dashboard)}
                            >
                              Editar
                            </button>

                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => onToggleStatus(dashboard)}
                            >
                              {dashboard.isActive ? "Desactivar" : "Activar"}
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                dashboard.id && onDelete(dashboard.id)
                              }
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    <i className="bi bi-inbox me-2"></i>
                    No hay tableros que coincidan con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer themed-surface">
        <small className="text-muted">
          Mostrando {filteredAndSortedDashboards.length} de {dashboards.length}{" "}
          tablero(s)
        </small>
      </div>
    </div>
  );
}
