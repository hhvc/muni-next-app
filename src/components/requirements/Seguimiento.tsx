// src/components/requirements/Seguimiento.tsx - CORREGIDO
"use client";

import {
  RequirementStatus,
  Priority,
  Asignacion,
} from "@/types/requirementTypes";

interface SeguimientoProps {
  editMode: boolean;
  estado: RequirementStatus;
  setEstado: (estado: RequirementStatus) => void;
  prioridad: Priority;
  setPrioridad: (prioridad: Priority) => void;
  asignadoA: Asignacion[];
  onAddAsignado: (usuarioId: string) => void;
  onRemoveAsignado: (index: number) => void;
  observaciones: string;
  setObservaciones: (observaciones: string) => void;
  nuevaObservacion: string;
  setNuevaObservacion: (observacion: string) => void;
  onAddObservacion: () => void;
  users: Array<{ uid: string; email: string; nombre: string }>;
  loading?: boolean;
}

// Opciones para los selects
const statusOptions: {
  value: RequirementStatus;
  label: string;
  color: string;
}[] = [
  { value: "inicial", label: "Inicial", color: "secondary" },
  { value: "en_revision", label: "En revisión", color: "info" },
  { value: "en_progreso", label: "En progreso", color: "warning" },
  { value: "completado", label: "Completado", color: "success" },
  { value: "suspendido", label: "Suspendido", color: "warning" },
  { value: "rechazado", label: "Rechazado", color: "danger" },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "no_asignada", label: "No asignada", color: "secondary" },
  { value: "baja", label: "Baja", color: "success" },
  { value: "media", label: "Media", color: "info" },
  { value: "alta", label: "Alta", color: "warning" },
  { value: "urgente", label: "Urgente", color: "danger" },
];

// Función para formatear fecha
const formatDate = (date: any) => {
  if (!date) return "N/A";
  const dateObj = date?.toDate?.() || new Date(date);
  return dateObj.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Seguimiento({
  editMode,
  estado,
  setEstado,
  prioridad,
  setPrioridad,
  asignadoA,
  onAddAsignado,
  onRemoveAsignado,
  observaciones,
  setObservaciones,
  nuevaObservacion,
  setNuevaObservacion,
  onAddObservacion,
  users,
  loading = false,
}: SeguimientoProps) {
  return (
    <div className="card mb-4">
      <div className="card-header bg-info text-white">
        <h6 className="mb-0">Seguimiento</h6>
      </div>
      <div className="card-body">
        {/* Estado */}
        <div className="mb-3">
          <label className="form-label fw-bold">Estado del requerimiento</label>
          {editMode ? (
            <select
              className="form-select"
              value={estado}
              onChange={(e) => setEstado(e.target.value as RequirementStatus)}
              disabled={loading}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <div>
              <span
                className={`badge bg-${
                  statusOptions.find((s) => s.value === estado)?.color
                }`}
              >
                {statusOptions.find((s) => s.value === estado)?.label}
              </span>
            </div>
          )}
        </div>

        {/* Prioridad asignada */}
        <div className="mb-3">
          <label className="form-label fw-bold">Prioridad asignada</label>
          {editMode ? (
            <select
              className="form-select"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as Priority)}
              disabled={loading}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <div>
              <span
                className={`badge bg-${
                  priorityOptions.find((p) => p.value === prioridad)?.color
                }`}
              >
                {priorityOptions.find((p) => p.value === prioridad)?.label}
              </span>
            </div>
          )}
        </div>

        {/* Asignado a */}
        <div className="mb-3">
          <label className="form-label fw-bold">Asignado a</label>
          {editMode ? (
            <div>
              <div className="mb-2">
                <select
                  className="form-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onAddAsignado(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  disabled={loading}
                >
                  <option value="">Seleccionar usuario para asignar...</option>
                  {users.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.nombre} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de usuarios asignados */}
              {asignadoA && asignadoA.length > 0 ? (
                asignadoA.map((asignacion, index) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between align-items-center border rounded p-2 mb-2"
                  >
                    <div>
                      <strong>{asignacion.usuarioNombre}</strong>
                      <div className="text-muted small">
                        Asignado: {formatDate(asignacion.fechaAsignacion)}
                        {asignacion.rol && (
                          <div className="text-muted">
                            Rol: {asignacion.rol}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onRemoveAsignado(index)}
                      disabled={loading}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-muted small">No hay asignaciones</p>
              )}
            </div>
          ) : (
            <div>
              {asignadoA && asignadoA.length > 0 ? (
                asignadoA.map((asignacion, index) => (
                  <div key={index} className="border rounded p-2 mb-2">
                    <strong>{asignacion.usuarioNombre}</strong>
                    <div className="text-muted small">
                      Asignado: {formatDate(asignacion.fechaAsignacion)}
                      {asignacion.rol && (
                        <div className="text-muted">Rol: {asignacion.rol}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-muted">No asignado</span>
              )}
            </div>
          )}
        </div>

        {/* Observaciones del equipo */}
        <div className="mb-3">
          <label className="form-label fw-bold">Observaciones del equipo</label>
          {editMode ? (
            <textarea
              className="form-control"
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agrega observaciones sobre el requerimiento"
              disabled={loading}
            />
          ) : (
            <div
              className="border rounded p-2 themed-surface"
              style={{ minHeight: "100px" }}
            >
              {observaciones || "Sin observaciones del equipo"}
            </div>
          )}
        </div>

        {/* Agregar nueva observación (solo en modo visualización) */}
        {!editMode && (
          <div className="mb-3">
            <label className="form-label fw-bold">
              Agregar nueva observación
            </label>
            <textarea
              className="form-control"
              rows={2}
              value={nuevaObservacion}
              onChange={(e) => setNuevaObservacion(e.target.value)}
              placeholder="Escribe una nueva observación..."
              disabled={loading}
            />
            <button
              className="btn btn-sm btn-outline-primary mt-2"
              onClick={onAddObservacion}
              disabled={!nuevaObservacion.trim() || loading}
            >
              <i className="bi bi-plus-circle me-1"></i>
              {loading ? "Agregando..." : "Agregar Observación"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
