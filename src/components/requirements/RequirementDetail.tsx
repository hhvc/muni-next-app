// src/components/requirements/RequirementDetail.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/firebase/clientApp";
import {
  doc,
  updateDoc,
  Timestamp,
  collection,
  addDoc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs, // ✅ Agregar getDocs
} from "firebase/firestore";
import {
  Requirement,
  RequirementStatus,
  RequirementType,
  Priority,
} from "@/types/requirementTypes";

interface RequirementDetailProps {
  requirement: Requirement;
  onClose: () => void;
  onUpdate: () => void;
}

const statusOptions: {
  value: RequirementStatus;
  label: string;
  color: string;
}[] = [
  { value: "inicial", label: "Inicial", color: "secondary" },
  { value: "en_revision", label: "En revisión", color: "info" },
  { value: "en_progreso", label: "En progreso", color: "warning" },
  { value: "completado", label: "Completado", color: "success" },
  { value: "rechazado", label: "Rechazado", color: "danger" },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "baja", label: "Baja", color: "secondary" },
  { value: "media", label: "Media", color: "info" },
  { value: "alta", label: "Alta", color: "warning" },
  { value: "urgente", label: "Urgente", color: "danger" },
];

// ✅ Función auxiliar para obtener etiqueta del tipo de requerimiento
const getRequirementTypeLabel = (type: string) => {
  const types = [
    { value: "reporte_estatico", label: "Reporte estático" },
    { value: "analisis_datos", label: "Análisis de datos" },
    { value: "nuevo_reporte_dinamico", label: "Nuevo reporte dinámico" },
    {
      value: "nuevo_formulario",
      label: "Nuevo formulario para captura de datos",
    },
    { value: "otros", label: "Otros" },
  ];
  const option = types.find((opt) => opt.value === type);
  return option ? option.label : type;
};

export default function RequirementDetail({
  requirement,
  onClose,
  onUpdate,
}: RequirementDetailProps) {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [estado, setEstado] = useState<RequirementStatus>(requirement.estado);
  const [prioridad, setPrioridad] = useState<Priority>(
    requirement.prioridad || "media"
  );
  const [asignadoA, setAsignadoA] = useState(requirement.asignadoA);
  const [observaciones, setObservaciones] = useState(
    requirement.comentarios || ""
  );
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);

  // Cargar usuarios para asignación
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("roles", "array-contains-any", ["admin", "root", "data", "hr"])
        );
        const querySnapshot = await getDocs(q);
        const usersData: any[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          usersData.push({
            uid: doc.id,
            email: data.email || "",
            nombre: data.displayName || data.email || "Usuario sin nombre",
          });
        });

        setUsers(usersData);
      } catch (err) {
        console.error("Error al cargar usuarios:", err);
      }
    };

    loadUsers();
  }, []);

  // Cargar historial de cambios
  useEffect(() => {
    const loadHistorial = async () => {
      if (!requirement.id) return;

      try {
        const historialRef = collection(db, "requirementHistory");
        const q = query(
          historialRef,
          where("requirementId", "==", requirement.id),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const historialData: any[] = [];

        querySnapshot.forEach((doc) => {
          historialData.push({ id: doc.id, ...doc.data() });
        });

        setHistorial(historialData);
      } catch (err) {
        console.error("Error al cargar historial:", err);
      }
    };

    loadHistorial();
  }, [requirement.id]);

  // Guardar cambios
  const handleSave = async () => {
    if (!requirement.id || !user) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const requirementRef = doc(db, "requirements", requirement.id);
      const cambios: any = {};
      const historialCambios: any = {
        usuario: {
          uid: user.uid,
          email: user.email || "",
          nombre: user.displayName || user.email || "Usuario",
        },
        timestamp: Timestamp.now(),
        cambios: {},
      };

      // Verificar cambios
      if (estado !== requirement.estado) {
        cambios.estado = estado;
        historialCambios.cambios.estado = {
          anterior: requirement.estado,
          nuevo: estado,
        };
      }

      if (prioridad !== requirement.prioridad) {
        cambios.prioridad = prioridad;
        historialCambios.cambios.prioridad = {
          anterior: requirement.prioridad,
          nuevo: prioridad,
        };
      }

      const asignadoAnterior = requirement.asignadoA || null;
      const asignadoNuevo = asignadoA || null;

      // Comparar objetos de asignación
      const asignadoAnteriorId = asignadoAnterior?.uid || null;
      const asignadoNuevoId = asignadoNuevo?.uid || null;

      if (asignadoAnteriorId !== asignadoNuevoId) {
        cambios.asignadoA = asignadoNuevo;
        historialCambios.cambios.asignadoA = {
          anterior: asignadoAnterior?.nombre || "No asignado",
          nuevo: asignadoNuevo?.nombre || "No asignado",
        };
      }

      if (observaciones !== requirement.comentarios) {
        cambios.comentarios = observaciones;
        historialCambios.cambios.comentarios = {
          anterior: requirement.comentarios || "",
          nuevo: observaciones,
        };
      }

      // Si hay cambios, guardarlos
      if (Object.keys(cambios).length > 0) {
        cambios.fechaActualizacion = Timestamp.now();
        await updateDoc(requirementRef, cambios);

        // Guardar en historial
        const historialRef = collection(db, "requirementHistory");
        await addDoc(historialRef, {
          requirementId: requirement.id,
          ...historialCambios,
        });

        setSuccess("Cambios guardados correctamente.");
        setTimeout(() => {
          onUpdate();
          setEditMode(false);
        }, 1000);
      } else {
        setSuccess("No se detectaron cambios.");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error al actualizar el requerimiento:", err);
      setError("Error al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  // Agregar nueva observación
  const handleAddObservacion = async () => {
    if (!requirement.id || !nuevaObservacion.trim() || !user) return;

    try {
      const requirementRef = doc(db, "requirements", requirement.id);
      const fechaHora = new Date().toLocaleString("es-ES");
      const observacionesActualizadas = observaciones
        ? `${observaciones}\n\n${fechaHora}: ${nuevaObservacion}`
        : `${fechaHora}: ${nuevaObservacion}`;

      await updateDoc(requirementRef, {
        comentarios: observacionesActualizadas,
        fechaActualizacion: Timestamp.now(),
      });

      // Guardar en historial
      const historialRef = collection(db, "requirementHistory");
      await addDoc(historialRef, {
        requirementId: requirement.id,
        usuario: {
          uid: user.uid,
          email: user.email || "",
          nombre: user.displayName || user.email || "Usuario",
        },
        timestamp: Timestamp.now(),
        cambios: {
          observacion: {
            accion: "agregada",
            contenido: nuevaObservacion,
          },
        },
      });

      setObservaciones(observacionesActualizadas);
      setNuevaObservacion("");
      setSuccess("Observación agregada correctamente.");
      setTimeout(() => setSuccess(""), 3000);
      onUpdate();
    } catch (err) {
      console.error("Error al agregar observación:", err);
      setError("Error al agregar la observación.");
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    const dateObj =
      date instanceof Date ? date : (date as any)?.toDate?.() || new Date(date);
    return dateObj.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
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
          ></button>
        </div>
      )}

      {success && (
        <div
          className="alert alert-success alert-dismissible fade show"
          role="alert"
        >
          <i className="bi bi-check-circle me-2"></i>
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      <div className="row">
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header bg-light">
              <h6 className="mb-0">Información del Requerimiento</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Tipo</label>
                    <div className="border rounded p-2 bg-light">
                      {getRequirementTypeLabel(requirement.tipo)}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Prioridad</label>
                    {editMode ? (
                      <select
                        className="form-select"
                        value={prioridad}
                        onChange={(e) =>
                          setPrioridad(e.target.value as Priority)
                        }
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
                            priorityOptions.find((p) => p.value === prioridad)
                              ?.color
                          }`}
                        >
                          {
                            priorityOptions.find((p) => p.value === prioridad)
                              ?.label
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Estado</label>
                    {editMode ? (
                      <select
                        className="form-select"
                        value={estado}
                        onChange={(e) =>
                          setEstado(e.target.value as RequirementStatus)
                        }
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
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-bold">Asignado a</label>
                    {editMode ? (
                      <select
                        className="form-select"
                        value={asignadoA?.uid || ""}
                        onChange={(e) => {
                          const selectedUser = users.find(
                            (u) => u.uid === e.target.value
                          );
                          setAsignadoA(selectedUser || null);
                        }}
                      >
                        <option value="">No asignado</option>
                        {users.map((user) => (
                          <option key={user.uid} value={user.uid}>
                            {user.nombre} ({user.email})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        {asignadoA ? (
                          <div className="border rounded p-2 bg-light">
                            <strong>{asignadoA.nombre}</strong>
                            <div className="text-muted small">
                              {asignadoA.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">No asignado</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">
                  Detalle del requerimiento
                </label>
                <div className="border rounded p-3 bg-light">
                  {requirement.detalle}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Observaciones</label>
                {editMode ? (
                  <textarea
                    className="form-control"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Agrega observaciones sobre el requerimiento"
                  />
                ) : (
                  <div
                    className="border rounded p-3 bg-light"
                    style={{ minHeight: "100px" }}
                  >
                    {observaciones || "Sin observaciones"}
                  </div>
                )}
              </div>

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
                  />
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={handleAddObservacion}
                    disabled={!nuevaObservacion.trim()}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Agregar Observación
                  </button>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label fw-bold">
                  Información del solicitante
                </label>
                <div className="border rounded p-3 bg-light">
                  <div>
                    <strong>Nombre:</strong> {requirement.solicitante.nombre}
                  </div>
                  <div>
                    <strong>Email:</strong> {requirement.solicitante.email}
                  </div>
                  <div>
                    <strong>Fecha de solicitud:</strong>{" "}
                    {formatDate(requirement.fechaCarga)}
                  </div>
                  {requirement.fechaActualizacion && (
                    <div>
                      <strong>Última actualización:</strong>{" "}
                      {formatDate(requirement.fechaActualizacion)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-header bg-light">
              <h6 className="mb-0">Historial de Cambios</h6>
            </div>
            <div
              className="card-body"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              {historial.length === 0 ? (
                <p className="text-muted">No hay historial de cambios</p>
              ) : (
                historial.map((item, index) => (
                  <div
                    key={item.id}
                    className={`mb-3 pb-3 ${
                      index < historial.length - 1 ? "border-bottom" : ""
                    }`}
                  >
                    <div className="small">
                      <div className="d-flex justify-content-between">
                        <strong>{item.usuario?.nombre || "Sistema"}</strong>
                        <span className="text-muted">
                          {item.timestamp ? formatDate(item.timestamp) : "N/A"}
                        </span>
                      </div>
                      {item.cambios && Object.keys(item.cambios).length > 0 && (
                        <div className="mt-2">
                          {Object.entries(item.cambios).map(
                            ([key, value]: [string, any]) => (
                              <div key={key} className="mt-1">
                                <div className="text-primary fw-semibold">
                                  {key}:
                                </div>
                                <div className="ps-2 small">
                                  {value.anterior !== undefined && (
                                    <div>
                                      <span className="text-muted">
                                        Anterior:
                                      </span>{" "}
                                      {String(value.anterior)}
                                    </div>
                                  )}
                                  {value.nuevo !== undefined && (
                                    <div>
                                      <span className="text-success">
                                        Nuevo:
                                      </span>{" "}
                                      {String(value.nuevo)}
                                    </div>
                                  )}
                                  {value.accion && (
                                    <div>
                                      <span className="text-info">Acción:</span>{" "}
                                      {String(value.accion)}
                                    </div>
                                  )}
                                  {value.contenido && (
                                    <div>
                                      <span className="text-info">
                                        Contenido:
                                      </span>{" "}
                                      {String(value.contenido)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        {editMode ? (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEditMode(false);
                setEstado(requirement.estado);
                setPrioridad(requirement.prioridad || "media");
                setAsignadoA(requirement.asignadoA);
                setObservaciones(requirement.comentarios || "");
              }}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose}>
              <i className="bi bi-x-circle me-1"></i>
              Cerrar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setEditMode(true)}
            >
              <i className="bi bi-pencil me-1"></i>
              Editar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
