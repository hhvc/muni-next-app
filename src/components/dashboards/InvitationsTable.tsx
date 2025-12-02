// src/components/dashboard/InvitationsTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Table, Spinner, Alert, Button } from "react-bootstrap";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { Invitation } from "@/types/dashboardTypes";
import { useAuth } from "@/components/AuthProvider";

const InvitationsTable: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar invitaciones desde Firestore
  useEffect(() => {
    const loadInvitations = async () => {
      try {
        setLoading(true);
        const invitationsRef = collection(db, "candidateInvitations");
        const snapshot = await getDocs(invitationsRef);

        const invitationsData: Invitation[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          invitationsData.push({
            id: docSnap.id,
            email: data.email,
            dni: data.dni,
            code: data.code,
            role: data.role,
            createdAt: data.createdAt,
            createdBy: data.createdBy,
            used: data.used || false,
            usedAt: data.usedAt,
            usedBy: data.usedBy,
          });
        });

        // Ordenar por fecha de creación (más reciente primero)
        invitationsData.sort(
          (a, b) =>
            b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        );

        setInvitations(invitationsData);
        setError(null);
      } catch (err) {
        console.error("Error cargando invitaciones:", err);
        setError(
          "Error al cargar invitaciones. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvitations();
  }, []);

  // Función para eliminar una invitación
  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta invitación?")) return;

    setDeletingId(invitationId);
    try {
      const invitationRef = doc(db, "candidateInvitations", invitationId);
      await deleteDoc(invitationRef);

      // Actualizar estado local
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      alert("Invitación eliminada exitosamente");
    } catch (err) {
      console.error("Error eliminando invitación:", err);
      alert(
        `Error al eliminar invitación: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Función para copiar enlace de invitación al portapapeles
  const copyInvitationLink = (code: string, dni: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/candidate?code=${code}&dni=${dni}`;

    navigator.clipboard
      .writeText(link)
      .then(() => alert("Enlace copiado al portapapeles"))
      .catch((err) => console.error("Error copiando enlace:", err));
  };

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
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5>Total de invitaciones: {invitations.length}</h5>
          <small className="text-muted">
            Pendientes: {invitations.filter((i) => !i.used).length} | Usadas:{" "}
            {invitations.filter((i) => i.used).length}
          </small>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            // Aquí podrías redirigir a un formulario de creación de invitaciones
            alert("Funcionalidad para crear invitaciones en desarrollo");
          }}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Nueva Invitación
        </Button>
      </div>

      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            <th>#</th>
            <th>DNI</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Código</th>
            <th>Estado</th>
            <th>Creada Por</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((invitation, index) => (
            <tr
              key={invitation.id}
              className={invitation.used ? "table-success" : ""}
            >
              <td>{index + 1}</td>
              <td>
                <code>{invitation.dni}</code>
              </td>
              <td>{invitation.email || "No especificado"}</td>
              <td>
                <span
                  className={`badge ${
                    invitation.role === "admin"
                      ? "bg-warning text-dark"
                      : invitation.role === "hr"
                      ? "bg-primary"
                      : invitation.role === "data"
                      ? "bg-info"
                      : invitation.role === "collaborator"
                      ? "bg-success"
                      : "bg-secondary"
                  }`}
                >
                  {invitation.role}
                </span>
              </td>
              <td>
                <code>{invitation.code}</code>
              </td>
              <td>
                <span
                  className={`badge ${
                    invitation.used ? "bg-success" : "bg-warning text-dark"
                  }`}
                >
                  {invitation.used ? "Usada" : "Pendiente"}
                </span>
              </td>
              <td>
                <small className="text-muted">
                  {invitation.createdBy === user?.uid
                    ? "Tú"
                    : invitation.createdBy?.substring(0, 8)}
                </small>
              </td>
              <td>
                <small>
                  {invitation.createdAt.toDate().toLocaleDateString()}
                  <br />
                  <span className="text-muted">
                    {invitation.createdAt.toDate().toLocaleTimeString()}
                  </span>
                </small>
              </td>
              <td>
                <div className="d-flex gap-2">
                  {!invitation.used && (
                    <>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          copyInvitationLink(invitation.code, invitation.dni)
                        }
                        title="Copiar enlace de invitación"
                      >
                        <i className="bi bi-link"></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        disabled={deletingId === invitation.id}
                        title="Eliminar invitación"
                      >
                        {deletingId === invitation.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <i className="bi bi-trash"></i>
                        )}
                      </Button>
                    </>
                  )}
                  {invitation.used && (
                    <small className="text-muted">
                      Usada por: {invitation.usedBy?.substring(0, 8) || "N/A"}
                    </small>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default InvitationsTable;
