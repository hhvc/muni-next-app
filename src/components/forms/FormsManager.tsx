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
import FormsTable from "@/components/forms/FormsTable";
import FormsGrid from "@/components/forms/FormsGrid";
import LoadingSpinner from "@/components/LoadingSpinner";

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
                <FormsTable
                  forms={forms}
                  canEditForms={canEditForms}
                  formatDate={formatDate}
                  onEdit={handleEditForm}
                  onToggleStatus={handleToggleFormStatus}
                  onDelete={handleDeleteForm}
                  onShowDeleteConfirm={setShowDeleteConfirm}
                  showDeleteConfirm={showDeleteConfirm}
                />

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