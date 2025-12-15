// src/components/requirements/RequirementsList.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/firebase/clientApp';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { Requirement, RequirementStatus, RequirementType, Priority } from '@/types/requirementTypes';
import LoadingSpinner from '@/components/LoadingSpinner';

// Definimos requirementTypes aquí también para este componente
const requirementTypes = [
  { value: 'reporte_estatico', label: 'Reporte estático' },
  { value: 'analisis_datos', label: 'Análisis de datos' },
  { value: 'nuevo_reporte_dinamico', label: 'Nuevo reporte dinámico' },
  { value: 'nuevo_formulario', label: 'Nuevo formulario para captura de datos' },
  { value: 'otros', label: 'Otros' },
] as const;

const statusOptions: { value: RequirementStatus; label: string; color: string }[] = [
  { value: 'inicial', label: 'Inicial', color: 'secondary' },
  { value: 'en_revision', label: 'En revisión', color: 'info' },
  { value: 'en_progreso', label: 'En progreso', color: 'warning' },
  { value: 'completado', label: 'Completado', color: 'success' },
  { value: 'rechazado', label: 'Rechazado', color: 'danger' },
];

interface User {
  uid: string;
  email: string;
  nombre: string;
  roles?: string[];
}

export default function RequirementsList() {
  const { user, userRoles } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningRequirementId, setAssigningRequirementId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const isAdmin = useMemo(() => 
    userRoles?.some(role => ['admin', 'root', 'data'].includes(role)) || false,
    [userRoles]
  );

  // Función para cargar usuarios (solo para administradores)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoadingUsers(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('roles', 'array-contains-any', ['admin', 'root', 'data', 'hr']));
      const querySnapshot = await getDocs(q);
      const usersData: User[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          uid: doc.id,
          email: data.email || '',
          nombre: data.displayName || data.email || 'Usuario sin nombre',
          roles: data.roles || [],
        });
      });

      setUsers(usersData);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  const fetchRequirements = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const requirementsRef = collection(db, 'requirements');
      
      let q;
      if (isAdmin) {
        q = query(requirementsRef, orderBy('fechaCarga', 'desc'));
      } else {
        q = query(
          requirementsRef, 
          where('solicitante.uid', '==', user.uid),
          orderBy('fechaCarga', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const requirementsData: Requirement[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requirementsData.push({
          id: doc.id,
          tipo: data.tipo as RequirementType,
          detalle: data.detalle,
          solicitante: data.solicitante,
          fechaCarga: data.fechaCarga?.toDate() || null,
          fechaActualizacion: data.fechaActualizacion?.toDate() || null,
          estado: data.estado as RequirementStatus,
          asignadoA: data.asignadoA || null,
          comentarios: data.comentarios || '',
          prioridad: data.prioridad as Priority || 'media',
        });
      });

      setRequirements(requirementsData);
      setError('');
    } catch (err) {
      console.error('Error al cargar requerimientos:', err);
      setError('Error al cargar los requerimientos');
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

  const handleStatusChange = async (requirementId: string, newStatus: RequirementStatus) => {
    if (!isAdmin) return;

    try {
      setUpdatingId(requirementId);
      const requirementRef = doc(db, 'requirements', requirementId);
      await updateDoc(requirementRef, {
        estado: newStatus,
        fechaActualizacion: Timestamp.now(),
      });

      // Actualizar estado local
      setRequirements(prev => prev.map(req => 
        req.id === requirementId 
          ? { ...req, estado: newStatus, fechaActualizacion: new Date() }
          : req
      ));
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      setError('Error al actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignUser = async (requirementId: string) => {
    if (!isAdmin || !selectedUserId) return;

    try {
      setUpdatingId(requirementId);
      const userToAssign = users.find(u => u.uid === selectedUserId);
      if (!userToAssign) throw new Error('Usuario no encontrado');

      const requirementRef = doc(db, 'requirements', requirementId);
      await updateDoc(requirementRef, {
        asignadoA: {
          uid: userToAssign.uid,
          email: userToAssign.email,
          nombre: userToAssign.nombre,
        },
        fechaActualizacion: Timestamp.now(),
      });

      // Actualizar estado local
      setRequirements(prev => prev.map(req => 
        req.id === requirementId 
          ? { 
              ...req, 
              asignadoA: {
                uid: userToAssign.uid,
                email: userToAssign.email,
                nombre: userToAssign.nombre,
              },
              fechaActualizacion: new Date() 
            }
          : req
      ));

      // Limpiar estado del modal
      setAssigningRequirementId(null);
      setSelectedUserId('');
    } catch (err) {
      console.error('Error al asignar usuario:', err);
      setError('Error al asignar el usuario');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUnassignUser = async (requirementId: string) => {
    if (!isAdmin) return;

    try {
      setUpdatingId(requirementId);
      const requirementRef = doc(db, 'requirements', requirementId);
      await updateDoc(requirementRef, {
        asignadoA: null,
        fechaActualizacion: Timestamp.now(),
      });

      // Actualizar estado local
      setRequirements(prev => prev.map(req => 
        req.id === requirementId 
          ? { ...req, asignadoA: null, fechaActualizacion: new Date() }
          : req
      ));
    } catch (err) {
      console.error('Error al desasignar usuario:', err);
      setError('Error al desasignar el usuario');
    } finally {
      setUpdatingId(null);
    }
  };

  const getRequirementTypeLabel = (type: string) => {
    const option = requirementTypes.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {requirements.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-clipboard-check text-muted" style={{ fontSize: '4rem' }}></i>
          <h4 className="text-muted mt-3">No hay requerimientos</h4>
          <p className="text-muted">
            {isAdmin 
              ? 'No hay requerimientos registrados en el sistema.'
              : 'No has creado ningún requerimiento aún.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Detalle</th>
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
                    <span className="badge bg-info">
                      {getRequirementTypeLabel(req.tipo)}
                    </span>
                  </td>
                  <td>
                    <div className="small">{req.detalle}</div>
                    {req.comentarios && (
                      <div className="text-muted small mt-1">
                        <strong>Comentarios:</strong> {req.comentarios}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge bg-${req.prioridad === 'alta' ? 'danger' : req.prioridad === 'media' ? 'warning' : 'secondary'}`}>
                      {req.prioridad}
                    </span>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select
                        className={`form-select form-select-sm border-0 bg-${statusOptions.find(s => s.value === req.estado)?.color}`}
                        value={req.estado}
                        onChange={(e) => handleStatusChange(req.id!, e.target.value as RequirementStatus)}
                        disabled={updatingId === req.id}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`badge bg-${statusOptions.find(s => s.value === req.estado)?.color}`}>
                        {statusOptions.find(s => s.value === req.estado)?.label}
                      </span>
                    )}
                  </td>
                  <td>
                    <small className="text-muted">
                      {formatDate(req.fechaCarga)}
                    </small>
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="small">
                        <div>{req.solicitante.nombre}</div>
                        <div className="text-muted">{req.solicitante.email}</div>
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      {req.asignadoA ? (
                        <div className="d-flex align-items-center">
                          <span className="badge bg-light text-dark">
                            {req.asignadoA.nombre}
                          </span>
                          <button
                            className="btn btn-sm btn-link text-danger ms-2"
                            onClick={() => req.id && handleUnassignUser(req.id)}
                            disabled={updatingId === req.id}
                            title="Desasignar"
                          >
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">No asignado</span>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <div className="btn-group" role="group">
                        {!req.asignadoA && (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => req.id && setAssigningRequirementId(req.id)}
                            disabled={updatingId === req.id}
                          >
                            Asignar
                          </button>
                        )}
                      </div>
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
          style={{ background: 'rgba(0,0,0,0.5)' }} 
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
                    setSelectedUserId('');
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
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Cargando usuarios...</span>
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
                    setSelectedUserId('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAssignUser(assigningRequirementId)}
                  disabled={!selectedUserId || updatingId === assigningRequirementId}
                >
                  {updatingId === assigningRequirementId ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Asignando...
                    </>
                  ) : (
                    'Asignar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}