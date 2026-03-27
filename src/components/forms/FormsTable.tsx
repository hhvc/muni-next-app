// src/components/forms/FormsTable.tsx

"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

interface GoogleFormMetadata {
  id?: string;
  title: string;
  description?: string | null;
  formUrl: string;
  thumbnailUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  isActive: boolean;
  allowedRoles?: string[] | null;
  order?: number;
}

type Props = {
  forms: GoogleFormMetadata[];
  canEditForms: boolean;
  formatDate: (date: Date | null) => string;
  onEdit: (form: GoogleFormMetadata) => void;
  onToggleStatus: (form: GoogleFormMetadata) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShowDeleteConfirm: (id: string | null) => void;
  showDeleteConfirm: string | null;
};

type SortField = "title" | "category" | "status" | "createdAt" | "none";
type SortOrder = "asc" | "desc";

export default function FormsTable({
  forms,
  canEditForms,
  formatDate,
  onEdit,
  onToggleStatus,
  onDelete,
  onShowDeleteConfirm,
  showDeleteConfirm,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("none");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Obtener categorías únicas
  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      forms
        .map((f) => f.category)
        .filter((c): c is string => Boolean(c && c.trim() !== ""))
    );
    return Array.from(categories).sort();
  }, [forms]);

  // Aplicar filtros y ordenamiento
  const filteredAndSortedForms = useMemo(() => {
    let result = forms.filter((form) => {
      // Filtro de búsqueda
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        form.title.toLowerCase().includes(searchLower) ||
        (form.description &&
          form.description.toLowerCase().includes(searchLower));

      // Filtro de categoría
      const matchesCategory =
        !filterCategory || form.category === filterCategory;

      // Filtro de estado
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "active" ? form.isActive : !form.isActive);

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
  }, [forms, searchTerm, filterCategory, filterStatus, sortBy, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-card-checklist me-2"></i>
          Lista de Formularios
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
                  Formulario
                  {sortBy === "title" && (
                    <i
                      className={`bi bi-sort-${
                        sortOrder === "asc" ? "down" : "up"
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
                      className={`bi bi-sort-${
                        sortOrder === "asc" ? "down" : "up"
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
                      className={`bi bi-sort-${
                        sortOrder === "asc" ? "down" : "up"
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
                      className={`bi bi-sort-${
                        sortOrder === "asc" ? "down" : "up"
                      } ms-2`}
                    ></i>
                  )}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedForms.length > 0 ? (
                filteredAndSortedForms.map((form) => (
                  <tr key={form.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {form.thumbnailUrl ? (
                          <div
                            className="rounded me-3"
                            style={{
                              position: "relative",
                              width: "40px",
                              height: "40px",
                            }}
                          >
                            <Image
                              src={form.thumbnailUrl}
                              alt={form.title}
                              fill
                              sizes="40px"
                              className="rounded"
                              style={{
                                objectFit: "cover",
                              }}
                              unoptimized={
                                process.env.NODE_ENV !== "production"
                              }
                            />
                          </div>
                        ) : (
                          <div
                            className="rounded bg-secondary d-flex align-items-center justify-content-center me-3"
                            style={{ width: "40px", height: "40px" }}
                          >
                            <i className="bi bi-card-checklist text-white"></i>
                          </div>
                        )}
                        <div>
                          <strong>{form.title}</strong>
                          {form.description && (
                            <div className="text-muted small">
                              {form.description.length > 60
                                ? `${form.description.substring(0, 60)}...`
                                : form.description}
                            </div>
                          )}
                          {form.formUrl && (
                            <div className="small">
                              <a
                                href={form.formUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-decoration-none"
                              >
                                <i className="bi bi-link-45deg me-1"></i>
                                Enlace
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      {form.category ? (
                        <span className="badge bg-primary">
                          {form.category}
                        </span>
                      ) : (
                        <span className="text-muted">Sin categoría</span>
                      )}
                    </td>

                    <td>
                      {form.isActive ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>
                          Activo
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          <i className="bi bi-x-circle me-1"></i>
                          Inactivo
                        </span>
                      )}
                    </td>

                    <td>
                      <small className="text-muted">
                        {formatDate(form.createdAt)}
                      </small>
                    </td>

                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <a
                          href={form.formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center"
                          title="Ver formulario"
                        >
                          <i className="bi bi-eye me-1"></i>
                          Ver
                        </a>

                        {canEditForms && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-info d-flex align-items-center"
                              onClick={() => onEdit(form)}
                              title="Editar formulario"
                            >
                              <i className="bi bi-pencil me-1"></i>
                              Editar
                            </button>

                            <button
                              className="btn btn-sm btn-outline-warning d-flex align-items-center"
                              onClick={() => onToggleStatus(form)}
                              title={
                                form.isActive
                                  ? "Desactivar formulario"
                                  : "Activar formulario"
                              }
                            >
                              {form.isActive ? (
                                <>
                                  <i className="bi bi-pause me-1"></i>
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-play me-1"></i>
                                  Activar
                                </>
                              )}
                            </button>

                            <button
                              className="btn btn-sm btn-outline-danger d-flex align-items-center"
                              onClick={() =>
                                onShowDeleteConfirm(form.id || null)
                              }
                              title="Eliminar formulario"
                            >
                              <i className="bi bi-trash me-1"></i>
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>

                      {/* Modal de confirmación de eliminación */}
                      {showDeleteConfirm === form.id && (
                        <div
                          className="modal fade show d-block"
                          style={{ background: "rgba(0,0,0,0.5)" }}
                          tabIndex={-1}
                        >
                          <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                              <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">
                                  <i className="bi bi-exclamation-triangle me-2"></i>
                                  Confirmar Eliminación
                                </h5>
                              </div>
                              <div className="modal-body">
                                <p>
                                  ¿Estás seguro de que deseas eliminar el
                                  formulario <strong>{form.title}</strong>?
                                </p>
                                <p className="text-danger">
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  Esta acción no se puede deshacer.
                                </p>
                              </div>
                              <div className="modal-footer">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary d-flex align-items-center"
                                  onClick={() => onShowDeleteConfirm(null)}
                                >
                                  <i className="bi bi-x-circle me-1"></i>
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger d-flex align-items-center"
                                  onClick={() =>
                                    form.id && onDelete(form.id)
                                  }
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Confirmar Eliminación
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    <i className="bi bi-inbox me-2"></i>
                    No hay formularios que coincidan con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-footer themed-surface">
        <small className="text-muted">
          Mostrando {filteredAndSortedForms.length} de {forms.length}{" "}
          formulario(s)
        </small>
      </div>
    </div>
  );
}
