// src/components/dashboards/UsersTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Form,
  Spinner,
  Alert,
  Modal,
  Button,
  Badge,
} from "react-bootstrap";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { DashboardUser } from "@/types/dashboardTypes";
import { useAuth } from "@/components/AuthProvider";

const UsersTable: React.FC = () => {
  const { userRoles } = useAuth();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([
    "pending_verification",
    "collaborator",
    "data",
    "hr",
    "admin",
    "root",
    "viewer",
    "editor",
    "manager",
    "guardiaurbana",
    "promotoresconvivencia"
  ]);
  const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [selectedPrimaryRole, setSelectedPrimaryRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Cargar usuarios desde Firestore
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        const usersData: DashboardUser[] = [];
        const rolesSet = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // Extraer roles del usuario
          const userRolesArray = Array.isArray(data.roles)
            ? data.roles
            : data.role
            ? [data.role]
            : ["pending_verification"];

          const primaryRoleValue =
            data.primaryRole || data.role || "pending_verification";

          // Agregar roles al conjunto para extraer roles únicos del sistema
          userRolesArray.forEach((role) => rolesSet.add(role));
          rolesSet.add(primaryRoleValue);

          usersData.push({
            id: docSnap.id,
            email: data.email || "Sin email",
            displayName: data.displayName || "Sin nombre",
            role: data.role || "pending_verification", // Mantener para compatibilidad
            roles: userRolesArray,
            primaryRole: primaryRoleValue,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            lastLoginAt: data.lastLoginAt?.toDate?.() || null,
            photoURL: data.photoURL || null,
          });
        });

        // Actualizar lista de roles disponibles con roles encontrados
        const allRoles = Array.from(rolesSet);
        const existingRoles = new Set([...availableRoles, ...allRoles]);
        setAvailableRoles(Array.from(existingRoles).sort());

        setUsers(usersData);
        setError(null);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
        setError("Error al cargar usuarios. Por favor, intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Verificar permisos para editar usuario
  const canEditUser = (targetUser: DashboardUser) => {
    // Root puede editar a todos
    if (userRoles?.includes("root")) return true;

    // Admin puede editar a todos excepto root
    if (userRoles?.includes("admin")) {
      return !targetUser.roles?.includes("root");
    }

    return false;
  };

  // Verificar si puede agregar/quitar rol específico
  const canManageRole = (role: string) => {
    // Root puede gestionar todos los roles
    if (userRoles?.includes("root")) return true;

    // Admin puede gestionar todos los roles excepto root
    if (userRoles?.includes("admin")) {
      return role !== "root";
    }

    return false;
  };

  // Abrir modal de edición
  const handleOpenEditModal = (user: DashboardUser) => {
    if (!canEditUser(user)) {
      alert("No tienes permisos para editar este usuario.");
      return;
    }

    setEditingUser(user);
    setSelectedPrimaryRole(
      user.primaryRole || user.role || "pending_verification"
    );
    setNewRole("");
    setShowEditModal(true);
  };

  // Cerrar modal
  const handleCloseEditModal = () => {
    setEditingUser(null);
    setShowEditModal(false);
    setNewRole("");
    setSelectedPrimaryRole("");
    setSaving(false);
  };

  // Agregar nuevo rol al usuario
  const handleAddRole = () => {
    if (!newRole || !editingUser) return;

    if (!canManageRole(newRole)) {
      alert("No tienes permisos para agregar este rol.");
      return;
    }

    const updatedRoles = [...(editingUser.roles || [])];
    if (!updatedRoles.includes(newRole)) {
      updatedRoles.push(newRole);
      setEditingUser({
        ...editingUser,
        roles: updatedRoles,
      });
      setNewRole("");
    }
  };

  // Quitar rol del usuario
  const handleRemoveRole = (roleToRemove: string) => {
    if (!editingUser) return;

    if (!canManageRole(roleToRemove)) {
      alert("No tienes permisos para quitar este rol.");
      return;
    }

    const updatedRoles = (editingUser.roles || []).filter(
      (role) => role !== roleToRemove
    );

    // Si quitamos el rol primario, debemos asignar uno nuevo
    let newPrimaryRole = selectedPrimaryRole;
    if (selectedPrimaryRole === roleToRemove && updatedRoles.length > 0) {
      newPrimaryRole = updatedRoles[0];
      setSelectedPrimaryRole(newPrimaryRole);
    }

    setEditingUser({
      ...editingUser,
      roles: updatedRoles,
      primaryRole: newPrimaryRole,
    });
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", editingUser.id);

      // Preparar datos para actualizar
      const updateData: any = {
        roles: editingUser.roles || [],
        primaryRole: selectedPrimaryRole,
        role: selectedPrimaryRole, // Mantener compatibilidad
        updatedAt: new Date(),
      };

      await updateDoc(userRef, updateData);

      // Actualizar estado local
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                roles: editingUser.roles || [],
                primaryRole: selectedPrimaryRole,
                role: selectedPrimaryRole,
              }
            : user
        )
      );

      alert("Roles actualizados exitosamente");
      handleCloseEditModal();
    } catch (err) {
      console.error("Error actualizando roles:", err);
      alert(
        `Error al actualizar los roles: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  // Filtrar roles disponibles para agregar (que el usuario no tiene ya)
  const getAvailableRolesForUser = () => {
    if (!editingUser) return availableRoles;
    const currentRoles = editingUser.roles || [];
    return availableRoles.filter(
      (role) => !currentRoles.includes(role) && canManageRole(role)
    );
  };

  // Obtener color para badge según rol
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "root":
        return "danger";
      case "admin":
        return "warning text-dark";
      case "hr":
        return "primary";
      case "data":
        return "info";
      case "collaborator":
        return "success";
      case "pending_verification":
        return "secondary";
      default:
        return "light text-dark";
    }
  };

  // Formatear fecha - ACTUALIZADO para aceptar Date | null | undefined
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Nunca";
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading)
    return (
      <div className="text-center my-4">
        <Spinner animation="border" size="sm" /> Cargando usuarios...
      </div>
    );

  if (error)
    return <Alert variant="danger">Error cargando usuarios: {error}</Alert>;

  if (users.length === 0)
    return <Alert variant="info">No se encontraron usuarios.</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Total de usuarios: {users.length}</h5>
        <small className="text-muted">
          {userRoles?.includes("root")
            ? "Permisos de root"
            : userRoles?.includes("admin")
            ? "Permisos de admin"
            : "Permisos limitados"}
        </small>
      </div>

      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Rol Principal</th>
            <th>Todos los Roles</th>
            <th>Último Login</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <small className="text-muted">
                  {user.id.substring(0, 8)}...
                </small>
              </td>
              <td>
                <div className="d-flex align-items-center">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="rounded-circle me-2"
                      style={{
                        width: "30px",
                        height: "30px",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div>
                    <div>{user.email}</div>
                    {user.displayName && (
                      <small className="text-muted">{user.displayName}</small>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <Badge
                  bg={getRoleBadgeColor(
                    user.primaryRole || user.role || "pending_verification"
                  )}
                  className="fw-normal"
                >
                  {user.primaryRole || user.role || "pending_verification"}
                </Badge>
              </td>
              <td>
                <div className="d-flex flex-wrap gap-1">
                  {user.roles?.map((role, index) => (
                    <Badge
                      key={index}
                      bg={getRoleBadgeColor(role)}
                      className="fw-normal"
                    >
                      {role}
                      {role === (user.primaryRole || user.role) && " ★"}
                    </Badge>
                  ))}
                </div>
              </td>
              <td>
                <small className="text-muted">
                  {formatDate(user.lastLoginAt)}
                </small>
              </td>
              <td>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleOpenEditModal(user)}
                  disabled={!canEditUser(user)}
                  title={
                    !canEditUser(user)
                      ? "No tienes permisos para editar este usuario"
                      : "Editar roles"
                  }
                >
                  <i className="bi bi-pencil me-1"></i>
                  Editar Roles
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal de edición de roles */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-people me-2"></i>
            Editar Roles de Usuario
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingUser && (
            <div>
              <div className="mb-4">
                <h5>{editingUser.displayName || editingUser.email}</h5>
                <p className="text-muted mb-1">
                  <i className="bi bi-envelope me-1"></i>
                  {editingUser.email}
                </p>
                {editingUser.displayName && (
                  <p className="text-muted">
                    <i className="bi bi-person me-1"></i>
                    {editingUser.displayName}
                  </p>
                )}
                {editingUser.createdAt && (
                  <p className="text-muted small">
                    <i className="bi bi-calendar me-1"></i>
                    Creado: {formatDate(editingUser.createdAt)}
                  </p>
                )}
              </div>

              {/* Roles actuales */}
              <div className="mb-4">
                <h6>Roles Asignados</h6>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {editingUser.roles?.map((role, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center gap-1"
                    >
                      <Badge
                        bg={getRoleBadgeColor(role)}
                        className="fw-normal d-flex align-items-center"
                      >
                        {role}
                        {role === selectedPrimaryRole && (
                          <span className="ms-1" title="Rol principal">
                            ★
                          </span>
                        )}
                      </Badge>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveRole(role)}
                        disabled={
                          !canManageRole(role) ||
                          (role === "root" && !userRoles?.includes("root")) ||
                          (editingUser.roles?.length === 1 &&
                            role === selectedPrimaryRole)
                        }
                        title={
                          editingUser.roles?.length === 1 &&
                          role === selectedPrimaryRole
                            ? "No se puede quitar el único rol"
                            : !canManageRole(role)
                            ? "No tienes permisos para quitar este rol"
                            : "Quitar rol"
                        }
                      >
                        <i className="bi bi-x"></i>
                      </Button>
                    </div>
                  ))}
                  {(!editingUser.roles || editingUser.roles.length === 0) && (
                    <span className="text-muted">Sin roles asignados</span>
                  )}
                </div>

                {/* Seleccionar rol principal */}
                <div className="mb-4">
                  <Form.Label>Rol Principal</Form.Label>
                  <Form.Select
                    value={selectedPrimaryRole}
                    onChange={(e) => setSelectedPrimaryRole(e.target.value)}
                    disabled={
                      !editingUser.roles || editingUser.roles.length === 0
                    }
                  >
                    {editingUser.roles?.map((role) => (
                      <option key={role} value={role}>
                        {role} {role === selectedPrimaryRole ? "(Actual)" : ""}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    El rol principal determina el acceso principal del usuario.
                  </Form.Text>
                </div>

                {/* Agregar nuevo rol */}
                <div className="mb-4">
                  <Form.Label>Agregar Nuevo Rol</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      disabled={getAvailableRolesForUser().length === 0}
                    >
                      <option value="">Selecciona un rol</option>
                      {getAvailableRolesForUser().map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Form.Select>
                    <Button
                      variant="outline-success"
                      onClick={handleAddRole}
                      disabled={!newRole}
                    >
                      <i className="bi bi-plus"></i> Agregar
                    </Button>
                  </div>
                  <Form.Text className="text-muted">
                    Selecciona un rol de la lista para agregar al usuario.
                  </Form.Text>
                </div>

                {/* Información de permisos */}
                <div className="alert alert-info">
                  <h6>
                    <i className="bi bi-info-circle me-2"></i>Información de
                    Permisos
                  </h6>
                  <ul className="mb-0">
                    <li>Roles disponibles: {availableRoles.join(", ")}</li>
                    <li>
                      {userRoles?.includes("root")
                        ? "Tienes permisos de root (puedes gestionar todos los roles)"
                        : userRoles?.includes("admin")
                        ? "Tienes permisos de admin (no puedes gestionar el rol root)"
                        : "Tienes permisos limitados"}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveChanges}
            disabled={
              saving || !editingUser?.roles || editingUser.roles.length === 0
            }
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UsersTable;
