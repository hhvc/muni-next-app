// src/components/requirements/RequirementDetail.tsx - VERSIÓN REFACTORIZADA
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
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  RequirementData,
  RequirementStatus,
  Priority,
} from "@/types/requirementTypes";
import Seguimiento from "./Seguimiento";
import HistorialCambios from "./HistorialCambios";
import DocumentForm from "@/components/documents/DocumentForm";

interface RequirementDetailProps {
  requirement: RequirementData & { id: string };
  onClose: () => void;
  onUpdate: () => void;
}

// Opciones para los selects (mantenemos solo las que se usan en este componente)
const destinosPrincipales = [
  { value: "informacion", label: "Información" },
  { value: "reporte", label: "Reporte" },
  { value: "formulario", label: "Formulario" },
  { value: "dashboard", label: "Dashboard (tablero)" },
  { value: "app", label: "App" },
  { value: "otro", label: "Otro" },
];

const naturalezasPedido = [
  { value: "informacion_estatica", label: "Información estática" },
  { value: "nuevo_desarrollo", label: "Nuevo desarrollo" },
  { value: "correccion_errores", label: "Corrección de errores" },
  { value: "mejora", label: "Mejora" },
  { value: "no_aplica", label: "No aplica" },
];

const appsReferencia = [
  { value: "rrhh", label: "RRHH" },
  { value: "d_track", label: "D-Track" },
  { value: "monitoreo", label: "Monitoreo" },
  { value: "no_aplica", label: "No aplica" },
];

const importancias = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

// Función para obtener etiqueta de opción
const getOptionLabel = (
  value: string,
  options: Array<{ value: string; label: string }>,
) => {
  const option = options.find((opt) => opt.value === value);
  return option ? option.label : value;
};

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

export default function RequirementDetail({
  requirement,
  onClose,
  onUpdate,
}: RequirementDetailProps) {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [estado, setEstado] = useState<RequirementStatus>(
    requirement.estado || "inicial",
  );
  const [prioridad, setPrioridad] = useState<Priority>(
    requirement.prioridad || "no_asignada",
  );
  const [asignadoA, setAsignadoA] = useState(requirement.asignadoA || []);
  const [observaciones, setObservaciones] = useState(
    requirement.comentarios || "",
  );
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [dashboardInfo, setDashboardInfo] = useState<{ title: string } | null>(
    null,
  );
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);

  // Cargar usuarios para asignación
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("roles", "array-contains-any", ["admin", "root", "data", "hr"]),
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

  // Cargar información del dashboard si hay referencia
  useEffect(() => {
    const loadDashboardInfo = async () => {
      if (requirement.dashboardReferencia) {
        try {
          const dashboardDoc = await getDoc(
            doc(db, "dashboards", requirement.dashboardReferencia),
          );
          if (dashboardDoc.exists()) {
            setDashboardInfo({
              title: dashboardDoc.data().title || "Sin título",
            });
          }
        } catch (err) {
          console.error("Error al cargar dashboard:", err);
        }
      }
    };

    loadDashboardInfo();
  }, [requirement.dashboardReferencia]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!requirement.id) return;

      try {
        setLoadingDocuments(true);

        const docsRef = collection(db, "documents");
        const q = query(
          docsRef,
          where("relatedRequirementId", "==", requirement.id),
          orderBy("createdAt", "desc"),
        );

        const querySnapshot = await getDocs(q);
        const docs: any[] = [];

        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });

        setDocuments(docs);
      } catch (err) {
        console.error("Error al cargar documentos:", err);
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, [requirement.id]);

  // Guardar cambios en el seguimiento
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

      // Verificar cambios en estado
      if (estado !== requirement.estado) {
        cambios.estado = estado;
        historialCambios.cambios.estado = {
          anterior: requirement.estado,
          nuevo: estado,
        };
      }

      // Verificar cambios en prioridad
      if (prioridad !== requirement.prioridad) {
        cambios.prioridad = prioridad;
        historialCambios.cambios.prioridad = {
          anterior: requirement.prioridad,
          nuevo: prioridad,
        };
      }

      // Verificar cambios en asignaciones
      if (
        JSON.stringify(asignadoA) !==
        JSON.stringify(requirement.asignadoA || [])
      ) {
        cambios.asignadoA = asignadoA;
        historialCambios.cambios.asignadoA = {
          anterior: requirement.asignadoA || [],
          nuevo: asignadoA,
        };
      }

      // Verificar cambios en observaciones
      if (observaciones !== (requirement.comentarios || "")) {
        cambios.comentarios = observaciones;
        historialCambios.cambios.comentarios = {
          anterior: requirement.comentarios || "",
          nuevo: observaciones,
        };
      }

      // Si hay cambios, guardarlos
      if (Object.keys(cambios).length > 0) {
        cambios.updatedAt = Timestamp.now();

        // Agregar al historial de estados si cambió el estado o la prioridad
        if (cambios.estado || cambios.prioridad) {
          const nuevoEstadoHistorial = {
            estado: cambios.estado || estado,
            prioridad: cambios.prioridad || prioridad,
            fecha: Timestamp.now(),
            usuarioId: user.uid,
            usuarioNombre: user.displayName || user.email || "Usuario",
          };

          cambios.historialEstados = [
            ...(requirement.historialEstados || []),
            nuevoEstadoHistorial,
          ];
        }

        await updateDoc(requirementRef, cambios);

        // Guardar en historial de cambios
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
        updatedAt: Timestamp.now(),
      });

      // Guardar en historial de cambios
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

  // Agregar usuario asignado
  const handleAddAsignado = (usuarioId: string) => {
    const usuario = users.find((u) => u.uid === usuarioId);
    if (!usuario) return;

    const nuevaAsignacion = {
      usuarioId: usuario.uid,
      usuarioNombre: usuario.nombre,
      fechaAsignacion: new Date(),
      rol: "responsable",
    };

    setAsignadoA([...asignadoA, nuevaAsignacion]);
  };

  // Eliminar usuario asignado
  const handleRemoveAsignado = (index: number) => {
    const nuevasAsignaciones = [...asignadoA];
    nuevasAsignaciones.splice(index, 1);
    setAsignadoA(nuevasAsignaciones);
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

      {/* Información del Requerimiento - Ahora en una sola columna */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">Información del Requerimiento</h6>
        </div>
        <div className="card-body">
          {/* Sección 1: Tipo de Requerimiento */}
          <div className="mb-4">
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-card-checklist me-2"></i>
              Tipo de Requerimiento
            </h6>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Destino principal</label>
                <div className="border rounded p-2 themed-surface">
                  {getOptionLabel(
                    requirement.destinoPrincipal || "informacion",
                    destinosPrincipales,
                  )}
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">
                  Naturaleza del pedido
                </label>
                <div className="border rounded p-2 themed-surface">
                  {getOptionLabel(
                    requirement.naturalezaPedido || "informacion_estatica",
                    naturalezasPedido,
                  )}
                </div>
              </div>
            </div>

            {/* Campos condicionales */}
            {requirement.destinoPrincipal === "app" &&
              requirement.appReferencia && (
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold">
                      App de referencia
                    </label>
                    <div className="border rounded p-2 themed-surface">
                      {getOptionLabel(
                        requirement.appReferencia,
                        appsReferencia,
                      )}
                    </div>
                  </div>
                </div>
              )}

            {requirement.destinoPrincipal === "dashboard" && (
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">
                    Dashboard de referencia
                  </label>
                  <div className="border rounded p-2 themed-surface">
                    {dashboardInfo
                      ? dashboardInfo.title
                      : requirement.dashboardTitulo ||
                        requirement.dashboardReferencia}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección 2: Pedido */}
          <div className="mb-4">
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-clipboard-plus me-2"></i>
              Pedido
            </h6>

            <div className="mb-3">
              <label className="form-label fw-bold">Título breve</label>
              <div className="border rounded p-2 themed-surface">
                {requirement.tituloBreve || "Sin título"}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">
                Descripción del problema o necesidad
              </label>
              <div className="border rounded p-3 themed-surface">
                {requirement.descripcionProblema || "Sin descripción"}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">
                Qué esperas que se resuelva
              </label>
              <div className="border rounded p-2 themed-surface">
                {requirement.expectativaResolucion || "Sin especificar"}
              </div>
            </div>
          </div>

          {/* Sección 3: Prioridad (valores originales) */}
          <div className="mb-4">
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-flag me-2"></i>
              Prioridad solicitada
            </h6>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">Importancia</label>
                <div className="border rounded p-2 themed-surface">
                  {getOptionLabel(
                    requirement.importancia || "baja",
                    importancias,
                  )}
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">Urgencia</label>
                <div className="border rounded p-2 themed-surface">
                  {getOptionLabel(requirement.urgencia || "baja", importancias)}
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">Fecha límite</label>
                <div className="border rounded p-2 themed-surface">
                  {requirement.fechaLimite
                    ? formatDate(requirement.fechaLimite)
                    : "Sin fecha límite"}
                </div>
              </div>
            </div>
          </div>

          {/* Sección 4: Detalles adicionales */}
          <div className="mb-4">
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-info-circle me-2"></i>
              Detalles adicionales
            </h6>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">
                  Usuarios que lo van a usar
                </label>
                <div className="border rounded p-2 themed-surface">
                  {requirement.usuariosQueUsaran || "No especificado"}
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">
                  Datos o fuentes necesarios
                </label>
                <div className="border rounded p-2 themed-surface">
                  {requirement.datosFuentesNecesarios || "No especificado"}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">
                  Métrica/KPI a incluir
                </label>
                <div className="border rounded p-2 themed-surface">
                  {requirement.metricasKPI || "No especificado"}
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">
                  Observaciones del solicitante
                </label>
                <div className="border rounded p-2 themed-surface">
                  {requirement.observaciones || "Sin observaciones"}
                </div>
              </div>
            </div>
          </div>

          {/* Sección 5: Información del solicitante */}
          <div className="mb-3">
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-person-circle me-2"></i>
              Información del solicitante
            </h6>

            <div className="border rounded p-3 themed-surface">
              <div className="row">
                <div className="col-md-6">
                  <div>
                    <strong>Nombre:</strong>{" "}
                    {requirement.solicitante?.nombre || "No disponible"}
                  </div>
                  <div>
                    <strong>Email:</strong>{" "}
                    {requirement.solicitante?.email || "No disponible"}
                  </div>
                </div>
                <div className="col-md-6">
                  <div>
                    <strong>Fecha de carga:</strong>{" "}
                    {formatDate(requirement.fechaCarga)}
                  </div>
                  {requirement.updatedAt && (
                    <div>
                      <strong>Última actualización:</strong>{" "}
                      {formatDate(requirement.updatedAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Componente Seguimiento */}
      <Seguimiento
        editMode={editMode}
        estado={estado}
        setEstado={setEstado}
        prioridad={prioridad}
        setPrioridad={setPrioridad}
        asignadoA={asignadoA}
        onAddAsignado={handleAddAsignado}
        onRemoveAsignado={handleRemoveAsignado}
        observaciones={observaciones}
        setObservaciones={setObservaciones}
        nuevaObservacion={nuevaObservacion}
        setNuevaObservacion={setNuevaObservacion}
        onAddObservacion={handleAddObservacion}
        users={users}
        loading={loading}
      />

      {/* 📎 Documentos asociados */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-paperclip me-2"></i>
            Documentos asociados
          </h6>

          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowDocumentForm(true)}
          >
            <i className="bi bi-plus-lg me-1"></i>
            Agregar documento
          </button>
        </div>

        <div className="card-body">
          {loadingDocuments ? (
            <div className="text-center text-muted">Cargando documentos...</div>
          ) : documents.length === 0 ? (
            <div className="text-muted">No hay documentos asociados.</div>
          ) : (
            <ul className="list-group list-group-flush">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <i className="bi bi-file-earmark-text me-2"></i>
                    {doc.title}
                  </div>

                  <a
                    href={doc.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-eye me-1"></i>
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Componente Historial de Cambios */}
      <HistorialCambios requirementId={requirement.id} />

      {showDocumentForm && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-upload me-2"></i>
                  Agregar documento al requerimiento
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowDocumentForm(false)}
                ></button>
              </div>

              <div className="modal-body">
                <DocumentForm
                  relatedRequirementId={requirement.id}
                  relatedRequirementTitle={requirement.tituloBreve}
                  onSuccess={() => {
                    setShowDocumentForm(false);
                    onUpdate();
                  }}
                  onCancel={() => setShowDocumentForm(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="d-flex justify-content-end gap-2 mt-4">
        {editMode ? (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEditMode(false);
                setEstado(requirement.estado || "inicial");
                setPrioridad(requirement.prioridad || "no_asignada");
                setAsignadoA(requirement.asignadoA || []);
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
              Editar Seguimiento
            </button>
          </>
        )}
      </div>
    </div>
  );
}
