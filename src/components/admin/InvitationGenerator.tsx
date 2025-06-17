// src/components/admin/InvitationGenerator.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button, Card, Form, Spinner, Alert } from "react-bootstrap";
import { db } from "@/firebase/clientApp";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider";

const InvitationGenerator = () => {
  const [dni, setDni] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);
  const [invitationCode, setInvitationCode] = useState("");
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Verificación robusta de inicialización de Firebase
  useEffect(() => {
    if (db) {
      setIsDbInitialized(true);
    } else {
      // Configurar verificación periódica
      const intervalId = setInterval(() => {
        if (db) {
          setIsDbInitialized(true);
          clearInterval(intervalId);
        }
      }, 500);

      // Configurar timeout para manejar casos de fallo
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (!db) {
          setError(
            "Firebase no se inicializó en el tiempo esperado. Recarga la página o contacta al administrador."
          );
        }
      }, 10000);

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar inicialización y disponibilidad de db
    if (!isDbInitialized || !db) {
      setMessage({
        type: "danger",
        text: "La base de datos no está disponible. Recarga la página.",
      });
      return;
    }

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

      let errorMessage = "Error al generar el código. Inténtalo de nuevo.";

      // Verificar si es un error de Firebase
      if (error instanceof FirebaseError) {
        if (error.code === "permission-denied") {
          errorMessage = "No tienes permiso para realizar esta acción.";
        } else {
          errorMessage = `Error de Firebase: ${error.message}`;
        }
      }
      // Verificar si es un Error estándar
      else if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Manejar otros tipos de errores
      else if (typeof error === "string") {
        errorMessage = error;
      }

      setMessage({
        type: "danger",
        text: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Manejar errores de inicialización
  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header as="h5">Generar Invitación</Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <strong>Error de inicialización:</strong> {error}
            <div className="mt-3">
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
              >
                Recargar página
              </Button>
            </div>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Si Firebase no está inicializado, mostrar mensaje de carga
  if (!isDbInitialized) {
    return (
      <Card className="shadow-sm">
        <Card.Header as="h5">Generar Invitación</Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
          <p className="mt-2">Inicializando base de datos...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header as="h5">Generar Invitación</Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="dniInput">
            <Form.Label>DNI del Candidato</Form.Label>
            <Form.Control
              type="text"
              value={dni}
              onChange={(e) => {
                // Validar que solo sean números
                const value = e.target.value.replace(/\D/g, "");
                setDni(value);
              }}
              placeholder="Ingresa el DNI (solo números)"
              required
              maxLength={8}
            />
            <Form.Text className="text-muted">
              Ingresa 8 dígitos sin puntos ni espacios
            </Form.Text>
          </Form.Group>

          {message && (
            <Alert variant={message.type} className="mt-3">
              {message.text}
            </Alert>
          )}

          {invitationCode && (
            <Alert variant="info" className="mt-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Código generado:</strong> {invitationCode}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(invitationCode);
                    setMessage({
                      type: "success",
                      text: "Código copiado al portapapeles!",
                    });
                  }}
                >
                  Copiar
                </Button>
              </div>
            </Alert>
          )}

          <div className="d-grid mt-4">
            <Button
              variant="primary"
              type="submit"
              disabled={isGenerating || !dni || dni.length < 7}
              size="lg"
            >
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
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default InvitationGenerator;
