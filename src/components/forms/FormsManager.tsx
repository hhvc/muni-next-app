// src/components/forms/FormsManager.tsx - VERSIÓN ACTUALIZADA
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
import FormCreator from "@/components/forms/FormCreator";
import FormsGrid from "@/components/forms/FormsGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import Image from "next/image";

// Definir el tipo para los formularios
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

type ManagerView = "view" | "create" | "edit";

export default function FormsManager() {
  const { user, userRoles } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<ManagerView>("view");
  const [forms, setForms] = useState<GoogleFormMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedForm, setSelectedForm] = useState<GoogleFormMetadata | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAllForms, setShowAllForms] = useState(false);

  // Verificar permisos para crear formularios
  const canCreateForms = userRoles?.some((role) =>
    ["admin", "hr", "root", "data"].includes(role)
  );

  // Verificar permisos para editar/eliminar formularios
  const canEditForms = userRoles?.some((role) =>
    ["admin", "root"].includes(role)
  );

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
    []
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

  // Cargar formularios
  const fetchForms = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const formsRef = collection(db, "forms");
      const querySnapshot = await getDocs(formsRef);
      const formsData: GoogleFormMetadata[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        const normalizedAllowedRoles = normalizeAllowedRoles(data.allowedRoles);

        const form: GoogleFormMetadata = {
          id: doc.id,
          title: data.title || "Sin título",
          description: data.description || null,
          formUrl: data.formUrl || "#",
          thumbnailUrl: data.thumbnailUrl || null,
          category: data.category || null,
          tags: Array.isArray(data.tags) ? data.tags : null,
          createdBy: data.createdBy || user.uid,
          createdAt: toSafeDate(data.createdAt),
          updatedAt: toSafeDate(data.updatedAt),
          isActive: data.isActive !== false,
          allowedRoles: normalizedAllowedRoles,
          order: data.order || 0,
        };

        formsData.push(form);
      });

      // Ordenar por fecha de creación descendente (los más recientes primero)
      formsData.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
      });

      setForms(formsData);
      setError("");
    } catch (err) {
      console.error("❌ Error al cargar formularios:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(
        `Error al cargar formularios: ${
          firebaseError.message || "Error desconocido"
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [user, normalizeAllowedRoles, toSafeDate]);

  // Cargar formularios cuando cambia el refreshKey
  useEffect(() => {
    fetchForms();
  }, [fetchForms, refreshKey]);

  // Manejar éxito en la creación
  const handleFormCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveView("view");
    setSelectedForm(null);
    setShowAllForms(false); // Resetear a vista de 6 formularios
  };

  // Manejar edición de formulario
  const handleEditForm = (form: GoogleFormMetadata) => {
    setSelectedForm(form);
    setActiveView("edit");
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setSelectedForm(null);
    setActiveView("view");
  };

  // Manejar eliminación de formulario
  const handleDeleteForm = async (formId: string) => {
    if (!canEditForms || !formId) {
      setError("No tienes permisos para eliminar formularios");
      return;
    }

    try {
      await deleteDoc(doc(db, "forms", formId));
      setRefreshKey((prev) => prev + 1);
      setShowDeleteConfirm(null);
      setError("");
    } catch (err) {
      console.error("❌ Error al eliminar formulario:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(
        `Error al eliminar formulario: ${
          firebaseError.message || "Error desconocido"
        }`
      );
    }
  };

  // Manejar activación/desactivación de formulario
  const handleToggleFormStatus = async (
    form: GoogleFormMetadata
  ) => {
    if (!canEditForms || !form.id) {
      setError("No tienes permisos para editar formularios");
      return;
    }

    try {
      await updateDoc(doc(db, "forms", form.id), {
        isActive: !form.isActive,
        updatedAt: Timestamp.now(),
      });
      setRefreshKey((prev) => prev + 1);
      setError("");
    } catch (err) {
      console.error("❌ Error al cambiar estado del formulario:", err);
      const firebaseError = err as { code?: string; message?: string };
      setError(
        `Error al cambiar estado: ${
          firebaseError.message || "Error desconocido"
        }`
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
              setSelectedForm(null);
              setShowAllForms(false); // Resetear vista al cambiar tab
            }}
          >
            <i className="bi bi-list-ul me-2"></i>
            Ver Formularios
            <span className="badge bg-secondary ms-2">{forms.length}</span>
          </button>
        </li>
        {canCreateForms && activeView !== "edit" && (
          <li className="nav-item">
            <button
              className={`nav-link ${activeView === "create" ? "active" : ""}`}
              onClick={() => setActiveView("create")}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Formulario
            </button>
          </li>
        )}
        {activeView === "edit" && selectedForm && (
          <li className="nav-item">
            <button className="nav-link active" disabled>
              <i className="bi bi-pencil me-2"></i>
              Editando: {selectedForm.title}
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
                <p className="mt-3 text-muted">Cargando Formularios...</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i
                    className="bi bi-card-checklist text-muted"
                    style={{ fontSize: "4rem" }}
                  ></i>
                </div>
                <h4 className="text-muted">No hay formularios registrados</h4>
                <p className="text-muted mb-4">
                  Comienza registrando tu primer formulario de Google Forms
                </p>
                {canCreateForms && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveView("create")}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Registrar Primer Formulario
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Resumen de estadísticas */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">{forms.length}</h3>
                        <p className="text-muted mb-0">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {forms.filter((f) => f.isActive).length}
                        </h3>
                        <p className="text-muted mb-0">Activos</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-0 themed-surface">
                      <div className="card-body text-center">
                        <h3 className="mb-0">
                          {
                            Array.from(
                              new Set(
                                forms
                                  .map((f) => f.category)
                                  .filter(Boolean)
                              )
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
                            forms.filter(
                              (f) => f.allowedRoles && f.allowedRoles.length > 0
                            ).length
                          }
                        </h3>
                        <p className="text-muted mb-0">Con restricciones</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de formularios */}
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-card-checklist me-2"></i>
                      Lista de Formularios
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Formulario</th>
                            <th>Categoría</th>
                            <th>Estado</th>
                            <th>Creado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forms.map((form) => (
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
                                      {form.thumbnailUrl ? (
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
                                            process.env.NODE_ENV !==
                                            "production"
                                          }
                                        />
                                      ) : (
                                        <div className="w-100 h-100 bg-secondary d-flex align-items-center justify-content-center rounded">
                                          <i className="bi bi-card-checklist text-white"></i>
                                        </div>
                                      )}
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
                                          ? `${form.description.substring(
                                              0,
                                              60
                                            )}...`
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
                                  <span className="text-muted">
                                    Sin categoría
                                  </span>
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
                                        onClick={() => handleEditForm(form)}
                                        title="Editar formulario"
                                      >
                                        <i className="bi bi-pencil me-1"></i>
                                        Editar
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-warning d-flex align-items-center"
                                        onClick={() =>
                                          handleToggleFormStatus(form)
                                        }
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
                                          setShowDeleteConfirm(form.id || null)
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
                                            ¿Estás seguro de que deseas eliminar
                                            el formulario{" "}
                                            <strong>{form.title}</strong>?
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
                                            onClick={() =>
                                              setShowDeleteConfirm(null)
                                            }
                                          >
                                            <i className="bi bi-x-circle me-1"></i>
                                            Cancelar
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-danger d-flex align-items-center"
                                            onClick={() =>
                                              form.id &&
                                              handleDeleteForm(form.id)
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer themed-surface">
                    <small className="text-muted">
                      Mostrando {forms.length} formulario(s)
                    </small>
                  </div>
                </div>

                {/* Vista en grid */}
                <div className="mt-4">
                  <h5 className="mb-3">
                    <i className="bi bi-grid-3x3-gap me-2"></i>
                    Vista Previa
                  </h5>
                  <FormsGrid forms={forms} initialShowAll={false} />

                </div>
              </div>
            )}
          </div>
        )}

        {(activeView === "create" || activeView === "edit") && (
          <div className="row">
            <div className="col-12 col-lg-8">
              <FormCreator
                onSuccess={handleFormCreated}
                formToEdit={
                  activeView === "edit" ? selectedForm : undefined
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
                    <i className="bi bi-lightbulb text-primary me-2"></i>
                    Tips para formularios de Google
                  </h5>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <small className="text-muted">
                        1. Asegúrate de que el formulario tenga permisos de
                        <strong> "Cualquier persona con el enlace puede responder"</strong>
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        2. Copia la URL completa desde la barra de direcciones
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        3. Usa categorías para organizar tus formularios
                      </small>
                    </li>
                    <li className="mb-2">
                      <small className="text-muted">
                        4. Los íconos pueden ser URLs de imágenes o emojis
                      </small>
                    </li>
                    <li>
                      <small className="text-muted">
                        5. Asigna roles permitidos para controlar quién puede ver cada formulario
                      </small>
                    </li>
                  </ul>

                  {activeView === "edit" && selectedForm && (
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="text-primary">
                        <i className="bi bi-info-circle me-2"></i>
                        Editando Formulario
                      </h6>
                      <p className="small text-muted">
                        Estás editando:{" "}
                        <strong>{selectedForm.title}</strong>
                      </p>
                      <p className="small text-muted">
                        Creado: {formatDate(selectedForm.createdAt)}
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