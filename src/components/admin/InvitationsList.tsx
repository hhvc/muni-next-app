// src/components/admin/InvitationsList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Table, Spinner, Alert } from "react-bootstrap";
import {
  collection,
  query,
  where,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { useAuth } from "@/components/AuthProvider";

const InvitationsList = () => {
  const [invitations, setInvitations] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const { user } = useAuth();

  // Verificar inicialización de Firebase con reintentos
  useEffect(() => {
    if (db) {
      setIsDbInitialized(true);
    } else {
      // Intentar verificar periódicamente
      const intervalId = setInterval(() => {
        if (db) {
          setIsDbInitialized(true);
          clearInterval(intervalId);
        }
      }, 500);

      // Limpiar después de 10 segundos
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (!db) {
          setError("Firebase no se inicializó en el tiempo esperado");
        }
      }, 10000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  useEffect(() => {
    const fetchInvitations = async () => {
      // Si no está inicializado o no hay usuario, salir
      if (!isDbInitialized || !user || !db) return;

      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "candidateInvitations"),
          where("createdBy", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);
        const invites: DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          invites.push({ id: doc.id, ...doc.data() });
        });

        setInvitations(invites);
      } catch (err) {
        console.error("Error fetching invitations:", err);
        setError("Error al cargar las invitaciones. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [user, isDbInitialized]);

  // Mostrar error si lo hay
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  // Si Firebase no está inicializado, mostrar mensaje de carga
  if (!isDbInitialized) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
        <p className="mt-2">Inicializando base de datos...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando invitaciones...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>ID</th>
          <th>DNI</th>
          <th>Código</th>
          <th>Fecha de Creación</th>
          <th>Usado</th>
        </tr>
      </thead>
      <tbody>
        {invitations.length > 0 ? (
          invitations.map((invite) => (
            <tr key={invite.id}>
              <td>{invite.id}</td>
              <td>{invite.dni}</td>
              <td>{invite.code}</td>
              <td>
                {invite.createdAt?.toDate
                  ? invite.createdAt.toDate().toLocaleString()
                  : "Fecha no disponible"}
              </td>
              <td>{invite.used ? "Sí" : "No"}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={5} className="text-center">
              No hay invitaciones generadas.
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  );
};

export default InvitationsList;
