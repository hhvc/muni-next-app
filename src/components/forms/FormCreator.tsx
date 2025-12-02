// src/components/forms/FormCreator.tsx - VERSIÓN SIN ANY
"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { FormMetadata } from "@/types/formTypes";
import { prepareForFirestore } from "@/utils/firestoreHelpers";

interface FormCreatorProps {
  onSuccess?: () => void;
}

export default function FormCreator({ onSuccess }: FormCreatorProps) {
  const { user, userRoles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados para el formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allowedRoles] = useState<string[]>(userRoles || []);
  const [order, setOrder] = useState(0);

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

  // Normalizar allowedRoles para asegurar que sea siempre un array o null
  const normalizeAllowedRoles = (roles: string[]): string[] | null => {
    if (!roles || roles.length === 0) return null;
    // Asegurarnos de que todos los elementos sean strings
    return roles.map((role) => role.toString());
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!user) {
      setError("Debes estar autenticado para crear formularios");
      setLoading(false);
      return;
    }

    // Validaciones básicas
    if (!title.trim()) {
      setError("El título es obligatorio");
      setLoading(false);
      return;
    }

    if (!formUrl.trim()) {
      setError("La URL del formulario es obligatoria");
      setLoading(false);
      return;
    }

    try {
      // Normalizar allowedRoles
      const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles);

      // Crear objeto usando FormMetadata como guía
      const formData: Omit<FormMetadata, "id" | "createdAt" | "updatedAt"> = {
        title: title.trim(),
        description: description.trim() || undefined,
        formUrl: formUrl.trim(),
        iconUrl: iconUrl.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        createdBy: user.uid,
        isActive: true,
        allowedRoles: normalizedAllowedRoles || undefined,
        order: order || 0,
      };

      console.log("📤 Datos del formulario a guardar:", formData);
      console.log("📊 allowedRoles normalizado:", normalizedAllowedRoles);

      // Limpiar datos (remover undefined) y preparar para Firestore
      const cleanedData = prepareForFirestore(formData);
      console.log("🧹 Datos limpios para Firestore:", cleanedData);

      // Agregar timestamps de Firestore
      const formToSave = {
        ...cleanedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("💾 Guardando en Firestore...");
      const docRef = await addDoc(collection(db, "forms"), formToSave);

      console.log("✅ Formulario guardado con ID:", docRef.id);

      // Limpiar formulario
      setTitle("");
      setDescription("");
      setFormUrl("");
      setIconUrl("");
      setCategory("");
      setTags([]);
      setOrder(0);
      setSuccess("Formulario registrado exitosamente");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("❌ Error al guardar formulario:", err);

      // Verificar si es un error de Firebase
      const firebaseError = err as { code?: string; message?: string };

      // Mensajes de error más específicos
      if (firebaseError.code === "permission-denied") {
        setError(
          "No tienes permisos para crear formularios. Contacta al administrador."
        );
      } else if (firebaseError.code === "unavailable") {
        setError(
          "No se pudo conectar con la base de datos. Verifica tu conexión."
        );
      } else {
        const errorMessage = firebaseError.message || "Error desconocido";
        setError(`Error al guardar el formulario: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">Registrar Nuevo Formulario</h5>
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
                placeholder="Ej: Formulario de empleados"
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
                placeholder="Ej: Recursos Humanos"
                disabled={loading}
              />
            </div>

            {/* URL del formulario */}
            <div className="col-12 mb-3">
              <label htmlFor="formUrl" className="form-label">
                URL del formulario de Google *
              </label>
              <input
                type="url"
                className="form-control"
                id="formUrl"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/e/..."
                required
                disabled={loading}
              />
              <div className="form-text">
                Copia y pega la URL completa del formulario de Google
              </div>
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
                placeholder="Describe el propósito del formulario..."
                disabled={loading}
              />
            </div>

            {/* URL del ícono */}
            <div className="col-md-6 mb-3">
              <label htmlFor="iconUrl" className="form-label">
                URL del ícono (opcional)
              </label>
              <input
                type="url"
                className="form-control"
                id="iconUrl"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://ejemplo.com/icono.svg"
                disabled={loading}
              />
              <div className="form-text">
                Deja vacío para usar ícono por defecto
              </div>
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
                    className="badge bg-primary d-flex align-items-center"
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
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setTitle("");
                setDescription("");
                setFormUrl("");
                setIconUrl("");
                setCategory("");
                setTags([]);
                setOrder(0);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
              ) : (
                "Guardar Formulario"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
