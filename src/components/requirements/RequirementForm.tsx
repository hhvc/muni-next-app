/* src/components/requirements/RequirementForm.tsx */
"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/firebase/clientApp";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { RequirementType, Priority } from "@/types/requirementTypes";

const requirementTypes = [
  { value: "reporte_estatico", label: "Reporte estático" },
  { value: "analisis_datos", label: "Análisis de datos" },
  { value: "nuevo_reporte_dinamico", label: "Nuevo reporte dinámico" },
  {
    value: "nuevo_formulario",
    label: "Nuevo formulario para captura de datos",
  },
  { value: "otros", label: "Otros" },
];

interface RequirementFormProps {
  horizontal?: boolean;
}

export default function RequirementForm({
  horizontal = false,
}: RequirementFormProps) {
  const { user } = useAuth();

  const [tipo, setTipo] = useState<RequirementType>("reporte_estatico");
  const [detalle, setDetalle] = useState("");
  const [prioridad, setPrioridad] = useState<Priority>("media");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Debes iniciar sesión para enviar un requerimiento.");
      return;
    }

    if (!detalle.trim()) {
      setError("Por favor, describe el requerimiento.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const requirementData = {
        tipo,
        detalle: detalle.trim(),
        solicitante: {
          uid: user.uid,
          email: user.email || "",
          nombre: user.displayName || user.email || "Usuario",
        },
        fechaCarga: Timestamp.now(),
        estado: "inicial" as const,
        prioridad,
        asignadoA: null,
        comentarios: "",
      };

      await addDoc(collection(db, "requirements"), requirementData);

      setSuccess(true);
      setDetalle("");
      setTipo("reporte_estatico");
      setPrioridad("media");

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Error al guardar el requerimiento:", err);
      setError(
        "Ocurrió un error al guardar el requerimiento. Por favor, inténtalo de nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">Nuevo Requerimiento de Datos</h5>
      </div>

      <div className="card-body">
        {success && (
          <div
            className="alert alert-success alert-dismissible fade show"
            role="alert"
          >
            <i className="bi bi-check-circle me-2"></i>
            Requerimiento enviado correctamente. Nos pondremos en contacto
            contigo.
            <button
              type="button"
              className="btn-close"
              onClick={() => setSuccess(false)}
            />
          </div>
        )}

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show"
            role="alert"
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
            />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {" "}
          <div className={`row ${horizontal ? "g-3" : ""}`}>
            {/* Tipo */}
            <div className={horizontal ? "col-12 col-lg-4" : "mb-3"}>
              <label htmlFor="tipo" className="form-label">
                Tipo de requerimiento
              </label>
              <select
                id="tipo"
                className="form-select themed-select"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as RequirementType)}
                required
              >
                {requirementTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Prioridad */}
            <div className={horizontal ? "col-12 col-lg-2" : "mb-3"}>
              <label htmlFor="prioridad" className="form-label">
                Prioridad
              </label>
              <select
                id="prioridad"
                className="form-select themed-select"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as Priority)}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            {/* Detalle */}
            <div className={horizontal ? "col-12 col-lg-6" : "mb-3"}>
              <label htmlFor="detalle" className="form-label">
                Detalle del requerimiento
              </label>
              <textarea
                id="detalle"
                className="form-control"
                rows={horizontal ? 3 : 5}
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Describe con el mayor detalle posible lo que necesitas. Incluye fechas, métricas, público objetivo, etc."
                required
              />
              {!horizontal && (
                <div className="form-text">
                  Sé lo más específico posible. Incluye plazos, formato deseado,
                  y cualquier información relevante.
                </div>
              )}
            </div>
          </div>
          <div className="d-flex justify-content-end mt-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Enviar Requerimiento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
