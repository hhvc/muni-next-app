// src/components/admin/InvitationsList.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Table, Spinner, Badge } from "react-bootstrap";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/clientApp";
import { useAuth } from "@/components/AuthProvider";

const InvitationsList = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, "candidateInvitations"),
          where("createdBy", "==", user.uid)
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setInvitations(data);
      } catch (error) {
        console.error("Error fetching invitations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [user]);

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>DNI</th>
          <th>Código</th>
          <th>Fecha</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {invitations.map((inv) => (
          <tr key={inv.id}>
            <td>{inv.dni}</td>
            <td className="font-monospace">{inv.code}</td>
            <td>{inv.createdAt?.toDate().toLocaleDateString()}</td>
            <td>
              {inv.used ? (
                <Badge bg="success">Usado</Badge>
              ) : (
                <Badge bg="warning">Pendiente</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default InvitationsList;