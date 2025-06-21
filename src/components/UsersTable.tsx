// src/components/dashboard/UsersTable.tsx
import React, { useState } from "react";
import { Table, Form, Spinner, Alert } from "react-bootstrap";
import { DashboardUser } from "@/types/dashboardTypes"; // Importa tu interfaz de usuario

interface UsersTableProps {
  users: DashboardUser[];
  loading: boolean;
  error: string | null;
  // Handler para cambiar rol - DEBE LLAMAR A UNA FUNCIÓN DE BACKEND
  onChangeRole: (userId: string, newRole: string) => Promise<void>;
  availableRoles: string[]; // Roles permitidos para asignar (ej: ["user", "RRHH-Admin", "admin"])
}

const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  error,
  onChangeRole,
  availableRoles,
}) => {
  const [changingRole, setChangingRole] = useState<string | null>(null); // Estado para saber qué usuario está cambiando rol

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId); // Indicar que este usuario está en proceso de cambio
    try {
      await onChangeRole(userId, newRole); // Llama al handler pasado por props (que llamará al backend)
    } catch (err) {
      console.error("Error cambiando rol en UsersTable:", err);
      alert(
        `Error al cambiar el rol: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setChangingRole(null); // Finalizar estado de cambio
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
    <Table striped bordered hover responsive className="mt-3">
      <thead>
        <tr>
          <th>UID</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.id}</td>
            <td>{user.email}</td>
            <td>
              <Form.Select
                value={user.role || "user"} // Valor actual o default 'user'
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                disabled={changingRole === user.id} // Deshabilitar si se está cambiando su rol
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Form.Select>
            </td>
            <td>
              {/* Puedes añadir más acciones aquí, como ver detalles del perfil de Auth */}
              {changingRole === user.id && (
                <Spinner animation="border" size="sm" className="ms-2" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default UsersTable;
