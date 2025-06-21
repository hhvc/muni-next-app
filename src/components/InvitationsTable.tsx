// src/components/dashboard/InvitationsTable.tsx
import React from "react";
import { Table, Spinner, Alert } from "react-bootstrap";
import { Invitation } from "@/types/dashboardTypes"; // Importa tu interfaz de invitación

interface InvitationsTableProps {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
}

const InvitationsTable: React.FC<InvitationsTableProps> = ({
  invitations,
  loading,
  error,
}) => {
  if (loading)
    return (
      <div className="text-center my-4">
        <Spinner animation="border" size="sm" /> Cargando invitaciones...
      </div>
    );
  if (error)
    return <Alert variant="danger">Error cargando invitaciones: {error}</Alert>;
  if (invitations.length === 0)
    return <Alert variant="info">No se encontraron invitaciones.</Alert>;

  return (
    <Table striped bordered hover responsive className="mt-3">
      <thead>
        <tr>
          <th>#</th>
          <th>Email Invitado</th>
          <th>Rol Asignado</th>
          <th>Creada Por</th>
          <th>Fecha Creación</th>
          <th>Estado</th>
          <th>Usada Por</th>
          <th>Fecha Uso</th>
        </tr>
      </thead>
      <tbody>
        {invitations.map((invitation, index) => (
          <tr key={invitation.id}>
            <td>{index + 1}</td>
            <td>{invitation.email}</td>
            <td>{invitation.role}</td>
            <td>{invitation.createdBy}</td> {/* Mostrar el UID del creador */}
            <td>{invitation.createdAt.toDate().toLocaleDateString()}</td>
            <td>{invitation.used ? "Usada" : "Pendiente"}</td>
            <td>{invitation.usedBy || "N/A"}</td>
            <td>{invitation.usedAt?.toDate().toLocaleDateString() || "N/A"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default InvitationsTable;
