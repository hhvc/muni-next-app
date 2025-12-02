// src/components/dashboard/UsersTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Table, Form, Spinner, Alert } from "react-bootstrap";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { DashboardUser } from "@/types/dashboardTypes";
import { useAuth } from "@/components/AuthProvider";

const UsersTable: React.FC = () => {
  const { userRoles } = useAuth();
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [availableRoles] = useState<string[]>([
    "pending_verification",
    "collaborator",
    "data",
    "hr",
    "admin",
    "root",
  ]);

  // Cargar usuarios desde Firestore
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        const usersData: DashboardUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          usersData.push({
            id: docSnap.id,
            email: data.email || "Sin email",
            role: data.role || "pending_verification",
            roles: data.roles || [data.role || "pending_verification"],
            primaryRole:
              data.primaryRole || data.role || "pending_verification",
          });
        });

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

  // Función para cambiar rol de usuario
  const handleRoleChange = async (userId: string, newRole: string) => {
    // Verificar permisos del usuario actual
    if (!userRoles?.includes("admin") && !userRoles?.includes("root")) {
      alert("No tienes permisos para cambiar roles.");
      return;
    }

    setChangingRole(userId);
    try {
      const userRef = doc(db, "users", userId);

      // Actualizar a nuevo sistema de roles (array)
      await updateDoc(userRef, {
        roles: [newRole],
        primaryRole: newRole,
        role: newRole, // Mantener compatibilidad con sistema antiguo
        updatedAt: new Date(),
      });

      // Actualizar estado local
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: newRole,
                roles: [newRole],
                primaryRole: newRole,
              }
            : user
        )
      );

      alert("Rol actualizado exitosamente");
    } catch (err) {
      console.error("Error cambiando rol:", err);
      alert(
        `Error al cambiar el rol: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setChangingRole(null);
    }
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
            : "Permisos de admin"}
        </small>
      </div>

      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Rol Actual</th>
            <th>Roles</th>
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
              <td>{user.email}</td>
              <td>
                <span
                  className={`badge ${
                    user.role === "root"
                      ? "bg-danger"
                      : user.role === "admin"
                      ? "bg-warning text-dark"
                      : user.role === "hr"
                      ? "bg-primary"
                      : user.role === "data"
                      ? "bg-info"
                      : user.role === "collaborator"
                      ? "bg-success"
                      : "bg-secondary"
                  }`}
                >
                  {user.role || "pending_verification"}
                </span>
              </td>
              <td>
                <div className="d-flex flex-wrap gap-1">
                  {user.roles?.map((role, index) => (
                    <small key={index} className="badge bg-light text-dark">
                      {role}
                    </small>
                  ))}
                </div>
              </td>
              <td>
                <Form.Select
                  value={user.role || "pending_verification"}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={
                    changingRole === user.id ||
                    (!userRoles?.includes("root") && user.role === "root")
                  }
                  size="sm"
                  style={{ width: "150px" }}
                >
                  {availableRoles.map((role) => (
                    <option
                      key={role}
                      value={role}
                      disabled={!userRoles?.includes("root") && role === "root"}
                    >
                      {role}
                    </option>
                  ))}
                </Form.Select>
                {changingRole === user.id && (
                  <Spinner animation="border" size="sm" className="ms-2" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default UsersTable;
