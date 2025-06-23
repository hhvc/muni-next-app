// src/components/InvitationForm.tsx

import React, { useState } from "react";
import { Form, Button, Alert, Spinner, Card } from "react-bootstrap";

interface InvitationFormProps {
  // CAMBIO CLAVE: onGenerateInvitation ahora espera dni, key y role, sin email
  onGenerateInvitation: (
    dni: string,
    key: string,
    role: string
  ) => Promise<string>; // Promesa que resuelve a un string de mensaje de éxito
  generating: boolean; // Indica si la invitación se está generando (proceso en curso)
  availableRoles: string[]; // Array de roles disponibles para seleccionar en el formulario
}

const InvitationForm: React.FC<InvitationFormProps> = ({
  onGenerateInvitation,
  generating,
  availableRoles,
}) => {
  // const [email, setEmail] = useState(""); // <-- ELIMINAR ESTE ESTADO
  const [dni, setDni] = useState(""); // Estado para DNI (ahora obligatorio)
  const [key, setKey] = useState(""); // Estado para Clave/Contraseña (ahora obligatorio)
  const [role, setRole] = useState(availableRoles[0] || ""); // Por defecto, el primer rol disponible
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); // Limpiar mensajes anteriores

    // CAMBIO CLAVE: Validación para DNI, Clave y Rol
    if (!dni || !key || !role) {
      setMessage({
        type: "danger",
        text: "DNI, Clave y Rol son campos requeridos.",
      });
      return;
    }

    try {
      // CAMBIO CLAVE: Llamar a la función prop, pasando DNI, Clave y Rol
      const successMessage = await onGenerateInvitation(dni, key, role);
      setMessage({
        type: "success",
        text:
          successMessage ||
          `Invitación para DNI: ${dni} generada exitosamente!`,
      });
      // Limpiar el formulario después del éxito
      setDni("");
      setKey("");
      setRole(availableRoles[0] || ""); // Restablecer al primer rol disponible
    } catch (error: unknown) {
      console.error("Error al generar invitación desde el formulario:", error);
      let errorMessage = "Error al generar invitación. Inténtalo de nuevo.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setMessage({ type: "danger", text: errorMessage });
    }
  };

  return (
    <Card className="mt-4 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <Card.Title className="h5 mb-0">Generar Nueva Invitación</Card.Title>
      </Card.Header>
      <Card.Body>
        {message && <Alert variant={message.type}>{message.text}</Alert>}

        <Form onSubmit={handleSubmit}>
          {/* CAMBIO CLAVE: Se elimina el campo de Email del Invitado */}
          {/* <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label>Email del Invitado</Form.Label>
            <Form.Control
              type="email"
              placeholder="ingresa@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={generating}
            />
          </Form.Group> */}

          <Form.Group className="mb-3" controlId="formDni">
            <Form.Label>DNI</Form.Label> {/* Ahora es obligatorio */}
            <Form.Control
              type="text"
              placeholder="DNI del invitado"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required // CAMBIO CLAVE: Obligatorio
              disabled={generating}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formKey">
            <Form.Label>Clave / Contraseña</Form.Label>{" "}
            {/* Ahora es obligatorio */}
            <Form.Control
              type="password" // Usar tipo password para ocultar la entrada
              placeholder="Clave de la invitación"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required // CAMBIO CLAVE: Obligatorio
              disabled={generating}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRole">
            <Form.Label>Rol a Asignar</Form.Label>
            <Form.Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              disabled={generating || availableRoles.length === 0}
            >
              {availableRoles.length === 0 ? (
                <option>No hay roles disponibles</option>
              ) : (
                availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))
              )}
            </Form.Select>
            {availableRoles.length === 0 && (
              <Form.Text className="text-danger">
                Define roles en INVITE_ROLES en HRDashboard.tsx
              </Form.Text>
            )}
          </Form.Group>

          <Button
            variant="success"
            type="submit"
            disabled={generating}
            className="w-100"
          >
            {generating ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Generando...
              </>
            ) : (
              "Generar Invitación"
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default InvitationForm;
