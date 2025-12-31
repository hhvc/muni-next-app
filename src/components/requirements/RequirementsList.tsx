// src/components/requirements/RequirementsList.tsx - VERSIÓN SIMPLIFICADA
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/firebase/clientApp";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import {
  RequirementData,
  RequirementStatus,
  Priority,
  DestinoPrincipal,
  NaturalezaPedido,
  Asignacion,
} from "@/types/requirementTypes";
import LoadingSpinner from "@/components/LoadingSpinner";
import RequirementDetail from "./RequirementDetail";

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

// Opciones para los nuevos campos
const destinosPrincipales = [
  { value: "informacion", label: "Información" },
  { value: "reporte", label: "Reporte" },
  { value: "formulario", label: "Formulario" },
  { value: "dashboard", label: "Dashboard" },
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

interface User {
  uid: string;
  email: string;
  nombre: string;
  roles?: string[];
}

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

// Función para obtener etiqueta de opción
const getOptionLabel = (
  value: string,
  options: Array<{ value: string; label: string }>
) => {
  const option = options.find((opt) => opt.value === value);
  return option ? option.label : value;
};

export default function RequirementsList() {
  const { user, userRoles } = useAuth();
  const [requirements, setRequirements] = useState<
    (RequirementData & { id: string })[]
  >([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningRequirementId, setAssigningRequirementId] = useState<
    string | null
  >(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRequirement, setSelectedRequirement] = useState<
    (RequirementData & { id: string }) | null
  >(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isAdmin = useMemo(
    () =>
      userRoles?.some((role) => ["admin", "root", "data"].includes(role)) ||
      false,
    [userRoles]
  );

  // ✅ Función para abrir el detalle del requerimiento
  const handleViewDetail = (requirement: RequirementData & { id: string }) => {
    setSelectedRequirement(requirement);
    setShowDetailModal(true);
  };

  // ✅ Función para cerrar el modal de detalle
  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedRequirement(null);
    fetchRequirements(); // Recargar la lista después de cambios
  };

  // Función para cargar usuarios (solo para administradores)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoadingUsers(true);
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("roles", "array-contains-any", ["admin", "root", "data", "hr"])
      );
      const querySnapshot = await getDocs(q);
      const usersData: User[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          uid: doc.id,
          email: data.email || "",
          nombre: data.displayName || data.email || "Usuario sin nombre",
          roles: data.roles || [],
        });
      });

      setUsers(usersData);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  const fetchRequirements = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const requirementsRef = collection(db, "requirements");

      let q;
      if (isAdmin) {
        q = query(requirementsRef, orderBy("fechaCarga", "desc"));
      } else {
        q = query(
          requirementsRef,
          where("solicitante.uid", "==", user.uid),
          orderBy("fechaCarga", "desc")
        );
      }

      const querySnapshot = await getDocs(q);
      const requirementsData: (RequirementData & { id: string })[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Construir el objeto RequirementData con los nuevos campos
        const requirement: RequirementData & { id: string } = {
          id: doc.id,
          // Datos del solicitante (automáticos)
          solicitante: data.solicitante || { uid: "", email: "", nombre: "" },
          fechaCarga: data.fechaCarga?.toDate() || new Date(),
          createdBy: data.createdBy || user?.uid || "",

          // Tipo de Requerimiento (Nuevos campos)
          destinoPrincipal:
            (data.destinoPrincipal as DestinoPrincipal) || "informacion",
          naturalezaPedido:
            (data.naturalezaPedido as NaturalezaPedido) ||
            "informacion_estatica",
          appReferencia: data.appReferencia,
          dashboardReferencia: data.dashboardReferencia,
          dashboardTitulo: data.dashboardTitulo,

          // Pedido
          tituloBreve: data.tituloBreve || "",
          descripcionProblema: data.descripcionProblema || "",
          expectativaResolucion: data.expectativaResolucion || "",

          // Prioridad
          importancia: data.importancia || "media",
          urgencia: data.urgencia || "media",
          fechaLimite: data.fechaLimite?.toDate(),

          // Detalles adicionales
          usuariosQueUsaran: data.usuariosQueUsaran,
          datosFuentesNecesarios: data.datosFuentesNecesarios,
          metricasKPI: data.metricasKPI,
          observaciones: data.observaciones,

          // Sistema de seguimiento
          estado: (data.estado as RequirementStatus) || "inicial",
          prioridad: (data.prioridad as Priority) || "no_asignada",
          asignadoA: data.asignadoA || [],
          comentarios: data.comentarios,

          // Historial de estados
          historialEstados: data.historialEstados || [],

          // Campos originales (mantenidos para compatibilidad)
          tipo: data.tipo,
          detalle: data.detalle,

          // Metadatos
          updatedAt: data.updatedAt?.toDate(),
          isActive: data.isActive !== false,
        };

        requirementsData.push(requirement);
      });

      setRequirements(requirementsData);
      setError("");
    } catch (err) {
      console.error("Error al cargar requerimientos:", err);
      setError("Error al cargar los requerimientos");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchRequirements();
    if (isAdmin) {
      fetchUsers();
    }
  }, [fetchRequirements, fetchUsers, isAdmin]);

  const handleStatusChange = async (
    requirementId: string,
    newStatus: RequirementStatus
  ) => {
    if (!isAdmin) return;

    try {
      setUpdatingId(requirementId);
      const requirementRef = doc(db, "requirements", requirementId);
      await updateDoc(requirementRef, {
        estado: newStatus,
        updatedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setRequirements((prev) =>
        prev.map((req) =>
          req.id === requirementId
            ? { ...req, estado: newStatus, updatedAt: new Date() }
            : req
        )
      );
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      setError("Error al actualizar el estado");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignUser = async (requirementId: string) => {
    if (!isAdmin || !selectedUserId) return;

    try {
      setUpdatingId(requirementId);
      const userToAssign = users.find((u) => u.uid === selectedUserId);
      if (!userToAssign) throw new Error("Usuario no encontrado");

      const nuevaAsignacion: Asignacion = {
        usuarioId: userToAssign.uid,
        usuarioNombre: userToAssign.nombre,
        fechaAsignacion: new Date(),
        rol: "responsable",
      };

      const requirementRef = doc(db, "requirements", requirementId);

      // Obtener las asignaciones actuales y agregar la nueva
      const currentRequirement = requirements.find(
        (r) => r.id === requirementId
      );
      const nuevasAsignaciones = [
        ...(currentRequirement?.asignadoA || []),
        nuevaAsignacion,
      ];

      await updateDoc(requirementRef, {
        asignadoA: nuevasAsignaciones,
        updatedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setRequirements((prev) =>
        prev.map((req) =>
          req.id === requirementId
            ? {
                ...req,
                asignadoA: nuevasAsignaciones,
                updatedAt: new Date(),
              }
            : req
        )
      );

      // Limpiar estado del modal
      setAssigningRequirementId(null);
      setSelectedUserId("");
    } catch (err) {
      console.error("Error al asignar usuario:", err);
      setError("Error al asignar el usuario");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUnassignUser = async (
    requirementId: string,
    asignacionIndex: number
  ) => {
    if (!isAdmin) return;

    try {
      setUpdatingId(requirementId);
      const requirementRef = doc(db, "requirements", requirementId);

      // Obtener las asignaciones actuales y eliminar la especificada
      const currentRequirement = requirements.find(
        (r) => r.id === requirementId
      );
      const nuevasAsignaciones = [...(currentRequirement?.asignadoA || [])];
      nuevasAsignaciones.splice(asignacionIndex, 1);

      await updateDoc(requirementRef, {
        asignadoA: nuevasAsignaciones,
        updatedAt: Timestamp.now(),
      });

      // Actualizar estado local
      setRequirements((prev) =>
        prev.map((req) =>
          req.id === requirementId
            ? { ...req, asignadoA: nuevasAsignaciones, updatedAt: new Date() }
            : req
        )
      );
    } catch (err) {
      console.error("Error al desasignar usuario:", err);
      setError("Error al desasignar el usuario");
    } finally {
      setUpdatingId(null);
    }
  };

  const getDestinoPrincipalLabel = (destino: DestinoPrincipal) => {
    return getOptionLabel(destino, destinosPrincipales);
  };

  const getNaturalezaPedidoLabel = (naturaleza: NaturalezaPedido) => {
    return getOptionLabel(naturaleza, naturalezasPedido);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <LoadingSpinner />
        <p className="mt-3 text-muted">Cargando requerimientos...</p>
      </div>
    );
  }

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

      {requirements.length === 0 ? (
        <div className="text-center py-5">
          <i
            className="bi bi-clipboard-check text-muted"
            style={{ fontSize: "4rem" }}
          ></i>
          <h4 className="text-muted mt-3">No hay requerimientos</h4>
          <p className="text-muted">
            {isAdmin
              ? "No hay requerimientos registrados en el sistema."
              : "No has creado ningún requerimiento aún."}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Título breve</th>
                <th>Destino</th>
                <th>Naturaleza</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
                {isAdmin && <th>Solicitante</th>}
                {isAdmin && <th>Asignado a</th>}
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div className="fw-semibold">
                      {req.tituloBreve || "Sin título"}
                    </div>
                    {req.descripcionProblema && (
                      <div
                        className="small text-muted mt-1 text-truncate"
                        style={{ maxWidth: "200px" }}
                      >
                        {req.descripcionProblema}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge bg-info">
                      {getDestinoPrincipalLabel(req.destinoPrincipal)}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark">
                      {getNaturalezaPedidoLabel(req.naturalezaPedido)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge bg-${
                        priorityOptions.find((p) => p.value === req.prioridad)
                          ?.color
                      }`}
                    >
                      {
                        priorityOptions.find((p) => p.value === req.prioridad)
                          ?.label
                      }
                    </span>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select
                        className={`form-select form-select-sm border-0 bg-${
                          statusOptions.find((s) => s.value === req.estado)
                            ?.color
                        }`}
                        value={req.estado}
                        onChange={(e) =>
                          handleStatusChange(
                            req.id!,
                            e.target.value as RequirementStatus
                          )
                        }
                        disabled={updatingId === req.id}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`badge bg-${
                          statusOptions.find((s) => s.value === req.estado)
                            ?.color
                        }`}
                      >
                        {
                          statusOptions.find((s) => s.value === req.estado)
                            ?.label
                        }
                      </span>
                    )}
                  </td>
                  <td>
                    <small className="text-muted">
                      {formatDate(req.fechaCarga)}
                    </small>
                    {req.fechaLimite && (
                      <div className="small">
                        <span className="text-danger">Vence: </span>
                        {formatDate(req.fechaLimite)}
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="small">
                        <div>{req.solicitante.nombre}</div>
                        <div className="text-muted">
                          {req.solicitante.email}
                        </div>
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      {req.asignadoA && req.asignadoA.length > 0 ? (
                        <div>
                          {req.asignadoA.map((asignacion, index) => (
                            <div
                              key={index}
                              className="d-flex align-items-center mb-1"
                            >
                              <span className="badge bg-light text-dark">
                                {asignacion.usuarioNombre}
                              </span>
                              <button
                                className="btn btn-sm btn-link text-danger ms-2"
                                onClick={() =>
                                  req.id && handleUnassignUser(req.id, index)
                                }
                                disabled={updatingId === req.id}
                                title="Desasignar"
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </div>
                          ))}
                          <button
                            className="btn btn-sm btn-outline-primary mt-1"
                            onClick={() =>
                              req.id && setAssigningRequirementId(req.id)
                            }
                            disabled={updatingId === req.id}
                            title="Agregar asignación"
                          >
                            <i className="bi bi-person-plus me-1"></i>
                            Agregar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            req.id && setAssigningRequirementId(req.id)
                          }
                          disabled={updatingId === req.id}
                          title="Asignar requerimiento"
                        >
                          <i className="bi bi-person-plus me-1"></i>
                          Asignar
                        </button>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => handleViewDetail(req)}
                        title="Ver detalle y editar"
                      >
                        <i className="bi bi-eye me-1"></i>
                        Ver
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para asignar usuario */}
      {assigningRequirementId && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Asignar Requerimiento</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setAssigningRequirementId(null);
                    setSelectedUserId("");
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="userSelect" className="form-label">
                    Seleccionar usuario para asignar
                  </label>
                  {loadingUsers ? (
                    <div className="text-center">
                      <div
                        className="spinner-border spinner-border-sm"
                        role="status"
                      >
                        <span className="visually-hidden">
                          Cargando usuarios...
                        </span>
                      </div>
                      <span className="ms-2">Cargando usuarios...</span>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="alert alert-warning">
                      No hay usuarios disponibles para asignar.
                    </div>
                  ) : (
                    <select
                      id="userSelect"
                      className="form-select"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">Selecciona un usuario</option>
                      {users.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.nombre} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAssigningRequirementId(null);
                    setSelectedUserId("");
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAssignUser(assigningRequirementId)}
                  disabled={
                    !selectedUserId || updatingId === assigningRequirementId
                  }
                >
                  {updatingId === assigningRequirementId ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Asignando...
                    </>
                  ) : (
                    "Asignar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalle del requerimiento */}
      {showDetailModal && selectedRequirement && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Detalle del Requerimiento
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={handleCloseDetail}
                ></button>
              </div>
              <div className="modal-body">
                <RequirementDetail
                  requirement={selectedRequirement}
                  onClose={handleCloseDetail}
                  onUpdate={fetchRequirements}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
