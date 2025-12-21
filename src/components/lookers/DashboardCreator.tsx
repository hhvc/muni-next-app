// src/components/lookers/DashboardCreator.tsx - VERSIÓN COMPLETA CON EDICIÓN
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { LookerDashboardMetadata } from "@/types/lookerTypes";
import { prepareForFirestore } from "@/utils/firestoreHelpers";

interface DashboardCreatorProps {
  onSuccess?: () => void;
  dashboardToEdit?: LookerDashboardMetadata | null;
  onCancel?: () => void;
}

export default function DashboardCreator({
  onSuccess,
  dashboardToEdit,
  onCancel,
}: DashboardCreatorProps) {
  const { user, userRoles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Estados para el formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [category, setCategory] = useState("");
  const [reportId, setReportId] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [refreshFrequency, setRefreshFrequency] = useState("");
  const [owner, setOwner] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allowedRoles] = useState<string[]>(userRoles || []);
  const [order, setOrder] = useState(0);

  // Efecto para cargar datos en modo edición
  useEffect(() => {
    if (dashboardToEdit) {
      setIsEditMode(true);
      setTitle(dashboardToEdit.title || "");
      setDescription(dashboardToEdit.description || "");
      setDashboardUrl(dashboardToEdit.dashboardUrl || "");
      setEmbedUrl(dashboardToEdit.embedUrl || "");
      setThumbnailUrl(dashboardToEdit.thumbnailUrl || "");
      setCategory(dashboardToEdit.category || "");
      setReportId(dashboardToEdit.reportId || "");
      setDataSource(dashboardToEdit.dataSource || "");
      setRefreshFrequency(dashboardToEdit.refreshFrequency || "");
      setOwner(dashboardToEdit.owner || "");
      setTags(dashboardToEdit.tags || []);
      setOrder(dashboardToEdit.order || 0);
    } else {
      setIsEditMode(false);
    }
  }, [dashboardToEdit]);

  // Agregar tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  // Eliminar tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Normalizar allowedRoles
  const normalizeAllowedRoles = (roles: string[]): string[] | null => {
    if (!roles || roles.length === 0) return null;
    return roles.map((role) => role.toString());
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!user) {
      setError("Debes estar autenticado para crear tableros");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("El título es obligatorio");
      setLoading(false);
      return;
    }

    if (!dashboardUrl.trim()) {
      setError("La URL del tablero es obligatoria");
      setLoading(false);
      return;
    }

    try {
      const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles);

      const dashboardData: Omit<
        LookerDashboardMetadata,
        "id" | "createdAt" | "updatedAt"
      > = {
        title: title.trim(),
        description: description.trim() || undefined,
        dashboardUrl: dashboardUrl.trim(),
        embedUrl: embedUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        category: category.trim() || undefined,
        reportId: reportId.trim() || undefined,
        dataSource: dataSource.trim() || undefined,
        refreshFrequency: refreshFrequency.trim() || undefined,
        owner: owner.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        createdBy: user.uid,
        isActive: true,
        allowedRoles: normalizedAllowedRoles || undefined,
        order: order || 0,
      };

      console.log("📤 Datos del tablero a guardar:", dashboardData);

      const cleanedData = prepareForFirestore(dashboardData);

      if (isEditMode && dashboardToEdit?.id) {
        // Modo edición - actualizar documento existente
        const dashboardToSave = {
          ...cleanedData,
          updatedAt: serverTimestamp(),
        };

        console.log("🔄 Actualizando tablero existente:", dashboardToEdit.id);
        await updateDoc(
          doc(db, "dashboards", dashboardToEdit.id),
          dashboardToSave
        );
        console.log("✅ Tablero actualizado con ID:", dashboardToEdit.id);
        setSuccess("Tablero actualizado exitosamente");
      } else {
        // Modo creación - agregar nuevo documento
        const dashboardToSave = {
          ...cleanedData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log("💾 Guardando nuevo tablero...");
        const docRef = await addDoc(
          collection(db, "dashboards"),
          dashboardToSave
        );

        console.log("✅ Tablero guardado con ID:", docRef.id);
        setSuccess("Tablero registrado exitosamente");
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("❌ Error al guardar tablero:", err);

      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError.code === "permission-denied") {
        setError(
          "No tienes permisos para crear tableros. Contacta al administrador."
        );
      } else if (firebaseError.code === "unavailable") {
        setError(
          "No se pudo conectar con la base de datos. Verifica tu conexión."
        );
      } else {
        const errorMessage = firebaseError.message || "Error desconocido";
        setError(`Error al guardar el tablero: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div
        className={`card-header ${
          isEditMode ? "bg-warning text-dark" : "bg-info text-white"
        }`}
      >
        <h5 className="mb-0">
          {isEditMode ? (
            <>
              <i className="bi bi-pencil me-2"></i>
              Editar Tablero de Looker Studio
            </>
          ) : (
            "Registrar Nuevo Tablero de Looker Studio"
          )}
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              className="alert alert-danger alert-dismissible fade show"
              role="alert"
            >
              <h6 className="alert-heading">❌ Error</h6>
              <p className="mb-0">{error}</p>
              <button
                type="button"
                className="btn-close"
                onClick={() => setError("")}
                aria-label="Cerrar"
              ></button>
            </div>
          )}

          {success && (
            <div
              className="alert alert-success alert-dismissible fade show"
              role="alert"
            >
              <h6 className="alert-heading">✅ Éxito</h6>
              <p className="mb-0">{success}</p>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSuccess("")}
                aria-label="Cerrar"
              ></button>
            </div>
          )}

          <div className="row">
            {/* Título */}
            <div className="col-md-6 mb-3">
              <label htmlFor="title" className="form-label">
                Título *
              </label>
              <input
                type="text"
                className="form-control"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Tablero Área Datos"
                required
                disabled={loading}
              />
            </div>

            {/* Categoría */}
            <div className="col-md-6 mb-3">
              <label htmlFor="category" className="form-label">
                Categoría
              </label>
              <input
                type="text"
                className="form-control"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Convivencia, Guardia Urbana, RRHH, etc."
                disabled={loading}
              />
            </div>

            {/* URL del tablero/ dashboard */}
            <div className="col-12 mb-3">
              <label htmlFor="dashboardUrl" className="form-label">
                URL del tablero de Looker Studio *
              </label>
              <input
                type="url"
                className="form-control"
                id="dashboardUrl"
                value={dashboardUrl}
                onChange={(e) => setDashboardUrl(e.target.value)}
                placeholder="https://lookerstudio.google.com/reporting/..."
                required
                disabled={loading}
              />
              <div className="form-text">
                URL completa del tablero de Looker Studio.
              </div>
            </div>

            {/* URL de embed (opcional) */}
            <div className="col-12 mb-3">
              <label htmlFor="embedUrl" className="form-label">
                URL de embed (opcional)
              </label>
              <input
                type="url"
                className="form-control"
                id="embedUrl"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://lookerstudio.google.com/embed/reporting/..."
                disabled={loading}
              />
              <div className="form-text">
                Si el tablero tiene una URL de embed diferente, colócala aquí.
              </div>
            </div>

            {/* ID del reporte */}
            <div className="col-md-6 mb-3">
              <label htmlFor="reportId" className="form-label">
                ID del Reporte (opcional)
              </label>
              <input
                type="text"
                className="form-control"
                id="reportId"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                placeholder="Ej: abc123-def456"
                disabled={loading}
              />
            </div>

            {/* Fuente de datos */}
            <div className="col-md-6 mb-3">
              <label htmlFor="dataSource" className="form-label">
                Fuente de datos (opcional)
              </label>
              <input
                type="text"
                className="form-control"
                id="dataSource"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                placeholder="Ej: Google Analytics, BigQuery, etc."
                disabled={loading}
              />
            </div>

            {/* Descripción */}
            <div className="col-12 mb-3">
              <label htmlFor="description" className="form-label">
                Descripción
              </label>
              <textarea
                className="form-control"
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el propósito del tablero, qué métricas incluye, etc."
                disabled={loading}
              />
            </div>

            {/* URL de miniatura */}
            <div className="col-md-6 mb-3">
              <label htmlFor="thumbnailUrl" className="form-label">
                URL de miniatura (opcional)
              </label>
              <input
                type="url"
                className="form-control"
                id="thumbnailUrl"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://ejemplo.com/miniatura.jpg"
                disabled={loading}
              />
              <div className="form-text">
                URL de una imagen para mostrar como vista previa.
              </div>
            </div>

            {/* Frecuencia de actualización */}
            <div className="col-md-3 mb-3">
              <label htmlFor="refreshFrequency" className="form-label">
                Frecuencia de actualización
              </label>
              <select
                className="form-select"
                id="refreshFrequency"
                value={refreshFrequency}
                onChange={(e) => setRefreshFrequency(e.target.value)}
                disabled={loading}
              >
                <option value="">Seleccionar...</option>
                <option value="realtime">Tiempo real</option>
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* Propietario */}
            <div className="col-md-3 mb-3">
              <label htmlFor="owner" className="form-label">
                Propietario (opcional)
              </label>
              <input
                type="text"
                className="form-control"
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Ej: Depto. Datos"
                disabled={loading}
              />
            </div>

            {/* Orden */}
            <div className="col-md-3 mb-3">
              <label htmlFor="order" className="form-label">
                Orden de visualización
              </label>
              <input
                type="number"
                className="form-control"
                id="order"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min="0"
                disabled={loading}
              />
              <div className="form-text">Menor número = aparece primero</div>
            </div>

            {/* Roles permitidos (solo información) */}
            <div className="col-md-3 mb-3">
              <label className="form-label">Roles permitidos</label>
              <div className="form-control bg-light">
                <small>
                  {allowedRoles && allowedRoles.length > 0 ? (
                    <span className="text-success">
                      Se usarán tus roles: {allowedRoles.join(", ")}
                    </span>
                  ) : (
                    <span className="text-muted">Sin restricciones de rol</span>
                  )}
                </small>
              </div>
            </div>

            {/* Tags */}
            <div className="col-12 mb-3">
              <label className="form-label">Etiquetas</label>
              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  placeholder="Agregar etiqueta..."
                  disabled={loading}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={addTag}
                  disabled={loading}
                >
                  Agregar
                </button>
              </div>

              {/* Tags agregados */}
              <div className="d-flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="badge bg-info d-flex align-items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      className="btn-close btn-close-white ms-2"
                      style={{ fontSize: "0.5rem" }}
                      onClick={() => removeTag(tag)}
                      aria-label="Eliminar"
                      disabled={loading}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between mt-4">
            <div>
              {isEditMode && onCancel && (
                <button
                  type="button"
                  className="btn btn-outline-secondary me-2"
                  onClick={onCancel}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Cancelar
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  if (isEditMode && dashboardToEdit) {
                    // En modo edición, restaurar valores originales
                    setTitle(dashboardToEdit.title || "");
                    setDescription(dashboardToEdit.description || "");
                    setDashboardUrl(dashboardToEdit.dashboardUrl || "");
                    setEmbedUrl(dashboardToEdit.embedUrl || "");
                    setThumbnailUrl(dashboardToEdit.thumbnailUrl || "");
                    setCategory(dashboardToEdit.category || "");
                    setReportId(dashboardToEdit.reportId || "");
                    setDataSource(dashboardToEdit.dataSource || "");
                    setRefreshFrequency(dashboardToEdit.refreshFrequency || "");
                    setOwner(dashboardToEdit.owner || "");
                    setTags(dashboardToEdit.tags || []);
                    setOrder(dashboardToEdit.order || 0);
                  } else {
                    // En modo creación, limpiar formulario
                    setTitle("");
                    setDescription("");
                    setDashboardUrl("");
                    setEmbedUrl("");
                    setThumbnailUrl("");
                    setCategory("");
                    setReportId("");
                    setDataSource("");
                    setRefreshFrequency("");
                    setOwner("");
                    setTags([]);
                    setOrder(0);
                  }
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
              >
                {isEditMode ? "Restaurar" : "Limpiar"}
              </button>
            </div>
            <button
              type="submit"
              className={`btn ${
                isEditMode ? "btn-warning" : "btn-info text-white"
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Guardando...
                </>
              ) : isEditMode ? (
                "Actualizar Tablero"
              ) : (
                "Guardar Tablero"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
