// src/components/admin/InvitationGenerator.tsx
"use client";

import React, { useState } from "react";
import { Button, Card, Form, Spinner, Alert } from "react-bootstrap";
import { db } from "@/firebase/clientApp";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";

const InvitationGenerator = () => {
  const [dni, setDni] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);
  const [invitationCode, setInvitationCode] = useState("");
  const { user } = useAuth();

  const generateCode = () => {
    // Generar código alfanumérico de 8 caracteres
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setMessage(null);

    if (!dni) {
      setMessage({
        type: "danger",
        text: "Por favor, ingresa un DNI.",
      });
      setIsGenerating(false);
      return;
    }

    if (!user) {
      setMessage({
        type: "danger",
        text: "Error: Usuario no autenticado.",
      });
      setIsGenerating(false);
      return;
    }

    try {
      const code = generateCode();
      await addDoc(collection(db, "candidateInvitations"), {
        dni: dni.trim(),
        code: code,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        used: false,
      });

      setInvitationCode(code);
      setMessage({
        type: "success",
        text: `Código generado con éxito para el DNI: ${dni}`,
      });
    } catch (error) {
      console.error("Error generando invitación:", error);
      setMessage({
        type: "danger",
        text: "Error al generar el código. Inténtalo de nuevo.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header as="h5">Generar Invitación</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>DNI del Candidato</Form.Label>
            <Form.Control
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ingresa el DNI"
              required
            />
          </Form.Group>

          {message && <Alert variant={message.type}>{message.text}</Alert>}

          {invitationCode && (
            <Alert variant="info" className="mt-3">
              <strong>Código generado:</strong> {invitationCode}
            </Alert>
          )}

          <Button variant="primary" type="submit" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Generando...
              </>
            ) : (
              "Generar Código"
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default InvitationGenerator;
